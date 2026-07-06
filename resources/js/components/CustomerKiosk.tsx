/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, CartItem, SauceType, DimsumSize, MerchantSettings, SauceConfig } from '../types';
import { SAUCE_INFO, formatCurrency, generateQRISPayload, formatWhatsAppMessage, getWhatsAppURL } from '../utils/mockData';
import { ShoppingBag, ArrowLeft, Plus, Minus, Info, Sparkles, Check, ChevronRight, MessageSquare, Flame } from 'lucide-react';

interface CustomerKioskProps {
  settings: MerchantSettings;
  onSubmitOrder: (order: Order) => void;
  orders: Order[];
  activeCookingStatuses: Record<string, Order['orderStatus']>;
  availableSauces: Record<SauceType, boolean>;
}

const DIMSUM_IMAGES = {
  mentai: '/src/assets/images/dimsum_mentai_1782869546221.jpg',
  cheese: '/src/assets/images/dimsum_cheese_1782869557226.jpg',
  tartar: '/src/assets/images/dimsum_tartar_1782869569048.jpg',
  general: '/src/assets/images/dimsum_mentai_1782869546221.jpg'
};

export default function CustomerKiosk({ settings, onSubmitOrder, orders, activeCookingStatuses, availableSauces }: CustomerKioskProps) {
  // Navigation Screens: 'home' | 'customize' | 'cart' | 'checkout' | 'qris' | 'success'
  const [screen, setScreen] = useState<'home' | 'customize' | 'cart' | 'checkout' | 'qris' | 'success'>('home');
  const [isTakeaway, setIsTakeaway] = useState<boolean>(false);
  const [tableNumber, setTableNumber] = useState<string>('');
  
  // Customization Wizard States
  const [selectedSize, setSelectedSize] = useState<DimsumSize>('small');
  const [itemPcs, setItemPcs] = useState<number>(3);
  const [pieceSauces, setPieceSauces] = useState<SauceType[]>(['original', 'original', 'original']);
  const [extraSauces, setExtraSauces] = useState<Record<SauceType, number>>({ original: 0, mentai: 0, cheese: 0, tartar: 0 });
  const [itemNotes, setItemNotes] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [activeCustomizingPiece, setActiveCustomizingPiece] = useState<number>(0);

  // Cart list
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Checkout detail states
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'qris'>('qris');
  
  // QRIS active states
  const [qrisTimer, setQrisTimer] = useState<number>(120); // 2 minutes countdown
  
  // Completed Order status track
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);

  // Auto-adjust piece-sauces list size when size changes
  const handleSizeChange = (size: DimsumSize) => {
    setSelectedSize(size);
    const pcs = size === 'small' ? 3 : 6;
    setItemPcs(pcs);
    
    // Find first available sauce to prefill
    const availableList = Object.keys(SAUCE_INFO) as SauceType[];
    const firstAvail = availableList.find(s => availableSauces[s]) || 'original';

    setPieceSauces(Array(pcs).fill(firstAvail));
    setActiveCustomizingPiece(0);
  };

  // Reset customizer
  const resetCustomizer = () => {
    const firstAvail = (Object.keys(SAUCE_INFO) as SauceType[]).find(s => availableSauces[s]) || 'original';
    setSelectedSize('small');
    setItemPcs(3);
    setPieceSauces(Array(3).fill(firstAvail));
    setExtraSauces({ original: 0, mentai: 0, cheese: 0, tartar: 0 });
    setItemNotes('');
    setItemQuantity(1);
    setActiveCustomizingPiece(0);
  };

  // Run countdown when QRIS is active
  useEffect(() => {
    if (screen !== 'qris' || qrisTimer <= 0) return;
    const timer = setInterval(() => {
      setQrisTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [screen, qrisTimer]);

  // Handle adding custom item to cart
  const handleAddToCart = () => {
    const basePrice = selectedSize === 'small' ? 15000 : 28000;
    
    // Calculate extra sauces total
    let extraSauceTotal = 0;
    const extraSaucesList = Object.entries(extraSauces)
      .filter(([_, qty]) => (qty as number) > 0)
      .map(([sauce, qty]) => {
        const q = qty as number;
        const cost = SAUCE_INFO[sauce as SauceType].price * q;
        extraSauceTotal += cost;
        return {
          sauce: sauce as SauceType,
          quantity: q,
          price: SAUCE_INFO[sauce as SauceType].price
        };
      });

    const unitPrice = basePrice + extraSauceTotal;
    const totalPrice = unitPrice * itemQuantity;

    const newItem: CartItem = {
      id: 'cart-' + Math.random().toString(36).substr(2, 9),
      size: selectedSize,
      pcs: itemPcs,
      pieceSauces: [...pieceSauces],
      extraSauces: extraSaucesList,
      notes: itemNotes,
      unitPrice,
      quantity: itemQuantity,
      totalPrice
    };

    setCart([...cart, newItem]);
    setScreen('checkout');
    resetCustomizer();
  };

  // Quick Preset Add to Cart (e.g., all Mentai, all Cheese, all Tartar, all Original)
  const handleAddPresetToCart = (size: DimsumSize, sauce: SauceType) => {
    const pcs = size === 'small' ? 3 : 6;
    const basePrice = size === 'small' ? 15000 : 28000;
    
    const newItem: CartItem = {
      id: 'cart-' + Math.random().toString(36).substr(2, 9),
      size,
      pcs,
      pieceSauces: Array(pcs).fill(sauce),
      extraSauces: [],
      notes: `Preset: Semua ${SAUCE_INFO[sauce].name.split(' ')[1]}`,
      unitPrice: basePrice,
      quantity: 1,
      totalPrice: basePrice
    };

    setCart([...cart, newItem]);
    setScreen('checkout');
    resetCustomizer();
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.totalPrice, 0);
  };

  // Final Order Submit Action
  const handleCheckoutSubmit = (forceSuccess: boolean = false) => {
    if (!customerName || !customerPhone) {
      alert('Mohon isi nama dan nomor WhatsApp Anda terlebih dahulu.');
      return;
    }

    if (!isTakeaway && !tableNumber) {
      alert('Mohon isi nomor meja Anda.');
      return;
    }

    const subtotal = getCartTotal();
    const totalAmount = subtotal + settings.serviceFee;
    
    const randomSuffix = Math.floor(100 + Math.random() * 900).toString();
    const orderNum = (orders.length + 1).toString().padStart(3, '0');
    
    const newOrder: Order = {
      id: `DS-${randomSuffix}`,
      orderNumber: orderNum,
      customerName,
      customerPhone,
      isTakeaway,
      tableNumber: isTakeaway ? undefined : tableNumber,
      items: [...cart],
      subtotal,
      serviceCharge: settings.serviceFee,
      totalAmount,
      paymentMethod,
      paymentStatus: paymentMethod === 'qris' && !forceSuccess ? 'unpaid' : 'paid',
      orderStatus: paymentMethod === 'qris' && !forceSuccess ? 'pending_payment' : 'received',
      createdAt: new Date().toISOString(),
    };

    if (paymentMethod === 'qris' && !forceSuccess) {
      // Show QRIS checkout screen first
      setPlacedOrder(newOrder);
      setQrisTimer(120);
      setScreen('qris');
    } else {
      // Cash payment or simulated success QRIS payment
      onSubmitOrder(newOrder);
      setPlacedOrder(newOrder);
      setCart([]);
      setScreen('success');
    }
  };

  // Simulate dynamic countdown format
  const formatTimer = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  // Find placed order current status in parent state
  const currentOrderStatus = placedOrder 
    ? (activeCookingStatuses[placedOrder.id] || placedOrder.orderStatus) 
    : 'received';

  return (
    <div id="customer_kiosk_device" className="w-full max-w-[420px] h-[780px] bg-gray-50 text-gray-900 rounded-[40px] border-8 border-gray-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col font-sans select-none">
      
      {/* Device Status Bar / Notch mockup */}
      <div className="absolute top-0 left-0 right-0 h-7 bg-white border-b border-gray-100 z-50 flex justify-between items-center px-6">
        <span className="text-[10px] font-semibold text-gray-500 font-mono">18:31</span>
        {/* Notch */}
        <div className="w-24 h-4 bg-gray-950 rounded-b-xl" />
        <div className="flex gap-1 items-center">
          <span className="w-2 h-2 bg-green-500 rounded-full" />
          <span className="text-[9px] text-green-600 font-bold font-mono">LTE</span>
        </div>
      </div>

      {/* Main Content Wrapper (padding-top for status bar) */}
      <div className="flex-1 pt-7 pb-4 flex flex-col overflow-y-auto">
        
        {/* ================= SCREEN: HOME / CATALOGUE ================= */}
        {screen === 'home' && (
          <div className="flex flex-col flex-1 p-4 space-y-4">
            {/* Header */}
            <div className="text-center pt-2">
              <div className="inline-flex items-center gap-1.5 bg-red-50 border border-red-100 px-3 py-1 rounded-full text-red-600 text-xs font-bold mb-1">
                <Flame className="w-3.5 h-3.5 fill-red-600 animate-pulse" /> Self-Service Order Kiosk
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-gray-900">{settings.shopName}</h2>
              <p className="text-[10px] text-gray-500 mt-0.5 font-medium">Lezat, Hangat, & Bebas Custom Saus</p>
            </div>

            {/* Service Selection Toggles */}
            <div className="grid grid-cols-2 gap-2 bg-gray-200/60 p-1 rounded-xl border border-gray-300/40">
              <button
                onClick={() => setIsTakeaway(false)}
                className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  !isTakeaway
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🍽️ Dine In (Makan Sini)
              </button>
              <button
                onClick={() => setIsTakeaway(true)}
                className={`py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                  isTakeaway
                    ? 'bg-red-600 text-white shadow-xs'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                🥡 Take Away (Bawa Pulang)
              </button>
            </div>

            {!isTakeaway && (
              <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between shadow-xs">
                <span className="text-xs text-gray-500 font-bold">Nomor Meja Anda:</span>
                <input
                  type="text"
                  placeholder="Isi Meja"
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-16 bg-gray-50 text-center text-xs font-black text-red-600 py-1 border border-gray-200 rounded-lg focus:outline-none focus:border-red-600"
                />
              </div>
            )}

            {/* Catalogue Cards */}
            <div className="space-y-3.5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <span className="w-1 h-3.5 bg-red-600 rounded-full inline-block"></span>
                Pilih Ukuran Dimsum
              </h3>
              
              {/* Product Card: Small */}
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all flex flex-col relative group shadow-xs">
                <div className="relative h-32 w-full bg-gray-100">
                  <img
                    src={DIMSUM_IMAGES.cheese}
                    alt="Dimsum Small"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow-md">
                    HOT SELLER
                  </div>
                </div>
                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-gray-900 text-sm">Dimsum Small</h4>
                      <span className="text-red-600 font-black font-mono text-sm">{formatCurrency(15000)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">Porsi hemat isi 3 pcs dimsum gembul yang bisa Anda pasangkan saus kesukaan sesuka hati.</p>
                    
                    {/* Presets */}
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                      <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider mb-1.5 text-left">
                        Pesan Instan (Semua Saus Sama):
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(SAUCE_INFO) as SauceType[]).map((sauceId) => {
                          const sInfo = SAUCE_INFO[sauceId];
                          const isAvailable = availableSauces[sauceId];
                          return (
                            <button
                              key={`preset-sm-${sauceId}`}
                              disabled={!isAvailable}
                              onClick={() => handleAddPresetToCart('small', sauceId)}
                              className={`py-1 px-1.5 rounded-lg border text-center text-[9px] font-bold transition-all ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100 text-gray-400'
                                  : 'bg-red-50 hover:bg-red-100 border-red-100 text-red-700 font-extrabold active:scale-95'
                              }`}
                            >
                              {sInfo.name.split(' ')[1] || 'Original'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleSizeChange('small');
                      setScreen('customize');
                    }}
                    className="mt-3 w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    Custom Saus & Beli <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Product Card: Medium */}
              <div className="bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 transition-all flex flex-col relative group shadow-xs">
                <div className="relative h-32 w-full bg-gray-100">
                  <img
                    src={DIMSUM_IMAGES.mentai}
                    alt="Dimsum Medium"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-2 left-2 bg-amber-500 text-gray-900 text-[9px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full shadow-md">
                    BEST VALUE (SAVE Rp 2.000)
                  </div>
                </div>
                <div className="p-3 flex flex-col justify-between flex-1">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-extrabold text-gray-900 text-sm">Dimsum Medium</h4>
                      <span className="text-red-600 font-black font-mono text-sm">{formatCurrency(28000)}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1 font-medium">Porsi puas isi 6 pcs dimsum montok. Bebas mix & match 3 jenis saus rahasia terfavorit kami.</p>

                    {/* Presets */}
                    <div className="mt-2.5 pt-2.5 border-t border-gray-100">
                      <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider mb-1.5 text-left">
                        Pesan Instan (Semua Saus Sama):
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(Object.keys(SAUCE_INFO) as SauceType[]).map((sauceId) => {
                          const sInfo = SAUCE_INFO[sauceId];
                          const isAvailable = availableSauces[sauceId];
                          return (
                            <button
                              key={`preset-med-${sauceId}`}
                              disabled={!isAvailable}
                              onClick={() => handleAddPresetToCart('medium', sauceId)}
                              className={`py-1 px-1.5 rounded-lg border text-center text-[9px] font-bold transition-all ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-100 text-gray-400'
                                  : 'bg-red-50 hover:bg-red-100 border-red-100 text-red-700 font-extrabold active:scale-95'
                              }`}
                            >
                              {sInfo.name.split(' ')[1] || 'Original'}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleSizeChange('medium');
                      setScreen('customize');
                    }}
                    className="mt-3 w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-xs font-bold py-2 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 uppercase tracking-wider"
                  >
                    Custom Saus & Beli <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

            {/* Float Cart Button */}
            {cart.length > 0 && (
              <button
                onClick={() => setScreen('cart')}
                className="mt-auto bg-green-600 hover:bg-green-700 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-between shadow-[0_4px_15px_rgba(22,163,74,0.2)] animate-bounce shrink-0"
              >
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Lihat Keranjang Belanja</span>
                  <span className="bg-white/20 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{cart.length}</span>
                </div>
                <span className="font-mono">{formatCurrency(getCartTotal())}</span>
              </button>
            )}
          </div>
        )}

        {/* ================= SCREEN: CUSTOMIZATION WIZARD ================= */}
        {screen === 'customize' && (
          <div className="flex flex-col flex-1 p-4 space-y-4">
            
            {/* Nav Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setScreen('home');
                  resetCustomizer();
                }}
                className="p-1.5 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-extrabold text-sm text-gray-900">Drizzler Studio</h3>
                <p className="text-[10px] text-gray-500 font-medium">Custom saus per butir dimsum Anda!</p>
              </div>
            </div>

            {/* Visual Customizer Panel */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-3 shadow-xs">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold tracking-wider text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                {selectedSize === 'small' ? 'Isi 3 Butir' : 'Isi 6 Butir'} Dimsum
              </span>
              
              {/* Dimsum circle mixers */}
              <div className="flex flex-wrap justify-center gap-4.5 py-3">
                {pieceSauces.map((sauce, idx) => {
                  const sInfo = SAUCE_INFO[sauce];
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveCustomizingPiece(idx)}
                      className={`w-14 h-14 rounded-full border-2 transition-all relative flex flex-col items-center justify-center ${
                        activeCustomizingPiece === idx
                          ? 'border-red-600 bg-red-50/50 scale-110 shadow-[0_4px_12px_rgba(220,38,38,0.15)]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {/* Dimsum graphic */}
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xs relative overflow-hidden">
                        🥟
                        {/* Sauce splash color overlay */}
                        <div 
                          style={{ backgroundColor: sInfo.color }}
                          className="absolute bottom-0 left-0 right-0 h-4 opacity-75 blur-[2px] transition-all"
                        />
                      </div>
                      <span className="text-[8px] font-extrabold text-gray-500 mt-1">Butir {idx + 1}</span>
                      <span className="absolute -top-1.5 -right-1 bg-red-600 border border-red-700 text-[7px] text-white font-mono px-1 rounded-full font-bold">
                        {sauce.charAt(0).toUpperCase()}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Saus Seragam Preset Fast-Selector inside customizer */}
              <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-left space-y-1.5">
                <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-wider">
                  Set Semua Butir ke Saus yang Sama:
                </p>
                <div className="grid grid-cols-4 gap-1.5">
                  {(Object.keys(SAUCE_INFO) as SauceType[]).map((sauceId) => {
                    const sInfo = SAUCE_INFO[sauceId];
                    const isAvailable = availableSauces[sauceId];
                    const isAllSelected = pieceSauces.every(s => s === sauceId);
                    return (
                      <button
                        key={`customizer-preset-${sauceId}`}
                        disabled={!isAvailable}
                        onClick={() => {
                          setPieceSauces(Array(itemPcs).fill(sauceId));
                        }}
                        className={`py-1 rounded-lg border text-center font-extrabold text-[10px] transition-all ${
                          !isAvailable
                            ? 'opacity-40 cursor-not-allowed bg-gray-100 border-gray-100 text-gray-400'
                            : isAllSelected
                            ? 'bg-red-600 border-red-700 text-white font-black shadow-xs scale-102'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 font-bold active:scale-95'
                        }`}
                      >
                        {sInfo.name.split(' ')[1] || 'Original'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Active piece edit instructions */}
              <div className="bg-gray-100 p-3 rounded-xl border border-gray-200 text-left">
                <p className="text-[10px] text-gray-700 font-bold mb-2">
                  Pilih Saus untuk <span className="text-red-600 font-extrabold">Dimsum Butir #{activeCustomizingPiece + 1}</span>:
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(SAUCE_INFO) as SauceType[]).map((sauceId) => {
                    const sInfo = SAUCE_INFO[sauceId];
                    const isSelected = pieceSauces[activeCustomizingPiece] === sauceId;
                    const isAvailable = availableSauces[sauceId];

                    return (
                      <button
                        key={sauceId}
                        disabled={!isAvailable}
                        onClick={() => {
                          const updated = [...pieceSauces];
                          updated[activeCustomizingPiece] = sauceId;
                          setPieceSauces(updated);
                          
                          // Auto advance piece for smooth fast clicking
                          if (activeCustomizingPiece < itemPcs - 1) {
                            setActiveCustomizingPiece(prev => prev + 1);
                          }
                        }}
                        className={`py-1.5 px-1 rounded-lg border text-center transition-all shadow-xs ${
                          !isAvailable
                            ? 'opacity-45 cursor-not-allowed border-gray-200 text-gray-400 bg-gray-50'
                            : isSelected
                            ? `border-red-600 text-red-600 font-black bg-red-50/80`
                            : 'border-gray-200 text-gray-700 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{sInfo.name.split(' ')[1]}</div>
                        <span className="text-[7px] text-gray-500 font-medium">
                          {!isAvailable ? 'Habis' : isSelected ? 'Dipilih' : 'Pilih'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Extra sauces cup additions */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                <Plus className="w-3 h-3 text-red-600" /> Tambah Cup Saus Ekstra (+Rp 3.000)
              </h4>
              
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(SAUCE_INFO) as SauceType[])
                  .filter((sauceId) => sauceId !== 'original')
                  .map((sauceId) => {
                  const sInfo = SAUCE_INFO[sauceId];
                  const qty = extraSauces[sauceId];
                  const isAvailable = availableSauces[sauceId];

                  return (
                    <div key={sauceId} className={`bg-white border rounded-xl p-2.5 flex flex-col items-center text-center shadow-xs ${isAvailable ? 'border-gray-200' : 'border-gray-100 opacity-40'}`}>
                      <span className="text-xs font-extrabold text-gray-800">{sInfo.name.split(' ')[1]}</span>
                      <span className="text-[9px] text-red-600 font-black mt-0.5">{formatCurrency(3000)}</span>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          disabled={qty <= 0 || !isAvailable}
                          onClick={() => setExtraSauces({ ...extraSauces, [sauceId]: qty - 1 })}
                          className="w-5 h-5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded flex items-center justify-center border border-gray-200 active:scale-90 disabled:opacity-40"
                        >
                          <Minus className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-xs font-black font-mono w-4 text-gray-800">{qty}</span>
                        <button
                          disabled={!isAvailable}
                          onClick={() => setExtraSauces({ ...extraSauces, [sauceId]: qty + 1 })}
                          className="w-5 h-5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded flex items-center justify-center border border-gray-200 active:scale-90"
                        >
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Note area */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600">Catatan Khusus (Opsional):</label>
              <input
                type="text"
                placeholder="Contoh: Saus Mentai bakar agak garing..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                className="w-full bg-white border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs focus:outline-none placeholder-gray-400 shadow-xs text-gray-950"
              />
            </div>

            {/* Quantity Selector & Add button */}
            <div className="mt-auto bg-white p-3 rounded-2xl border border-gray-200 flex items-center justify-between shrink-0 shadow-sm">
              <div className="flex items-center gap-2.5">
                <button
                  disabled={itemQuantity <= 1}
                  onClick={() => setItemQuantity(prev => prev - 1)}
                  className="w-7 h-7 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center justify-center border border-gray-200 active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-sm font-black font-mono w-5 text-center text-gray-900">{itemQuantity}</span>
                <button
                  onClick={() => setItemQuantity(prev => prev + 1)}
                  className="w-7 h-7 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg flex items-center justify-center border border-gray-200 active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs py-2.5 px-5 rounded-xl shadow-md transition-all uppercase tracking-wider"
              >
                Checkout - {formatCurrency((selectedSize === 'small' ? 15000 : 28000) * itemQuantity + (Object.entries(extraSauces).reduce((s, [_, q]) => s + (q as number) * 3000, 0) * itemQuantity))}
              </button>
            </div>

          </div>
        )}

        {/* ================= SCREEN: SHOPPING CART ================= */}
        {screen === 'cart' && (
          <div className="flex flex-col flex-1 p-4 space-y-4">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <button
                onClick={() => setScreen('home')}
                className="p-1.5 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-extrabold text-sm text-gray-900">Keranjang Belanja ({cart.length} item)</h3>
            </div>

            {/* Cart Items List */}
            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              {cart.map((item) => {
                // Sauce list display
                const sauceCounts = item.pieceSauces.reduce((acc, s) => {
                  acc[s] = (acc[s] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const sDetails = Object.entries(sauceCounts)
                  .map(([sauce, count]) => `${count}x ${SAUCE_INFO[sauce as SauceType].name.split(' ')[1]}`)
                  .join(', ');

                return (
                  <div key={item.id} className="bg-white border border-gray-200 p-3 rounded-xl flex justify-between gap-3 relative shadow-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-gray-900">Dimsum {item.size === 'small' ? 'Small (3 pcs)' : 'Medium (6 pcs)'}</span>
                        <span className="text-[10px] text-gray-400 font-mono font-bold">x{item.quantity}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 leading-tight font-medium">Saus: {sDetails}</p>
                      
                      {item.extraSauces.length > 0 && (
                        <p className="text-[9px] text-red-600 font-bold">
                          Cup Extra: {item.extraSauces.map(es => `${SAUCE_INFO[es.sauce].name.split(' ')[1]} (x${es.quantity})`).join(', ')}
                        </p>
                      )}

                      {item.notes && (
                        <p className="text-[9px] text-amber-600 italic font-medium">" {item.notes} "</p>
                      )}
                    </div>

                    <div className="flex flex-col justify-between items-end shrink-0">
                      <span className="text-xs font-black font-mono text-gray-800">{formatCurrency(item.totalPrice)}</span>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-[10px] text-red-600 hover:text-red-700 font-bold underline"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Service & Total Breakdown */}
            <div className="bg-white p-3 rounded-2xl border border-gray-200 space-y-1.5 font-mono text-xs text-gray-600 shadow-xs">
              <div className="flex justify-between">
                <span>Subtotal Pesanan</span>
                <span className="text-gray-900 font-bold">{formatCurrency(getCartTotal())}</span>
              </div>
              <div className="flex justify-between">
                <span>Biaya Layanan</span>
                <span className="text-gray-900 font-bold">{formatCurrency(settings.serviceFee)}</span>
              </div>
              <div className="border-t border-gray-200 my-1.5 pt-1.5 flex justify-between text-sm font-black text-gray-900">
                <span>Total Bayar</span>
                <span className="text-red-600 font-black">{formatCurrency(getCartTotal() + settings.serviceFee)}</span>
              </div>
            </div>

            {/* Advance Checkout Button */}
            <button
              onClick={() => setScreen('checkout')}
              className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black py-3 px-4 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              Lanjut ke Pembayaran <ChevronRight className="w-4 h-4" />
            </button>

          </div>
        )}

        {/* ================= SCREEN: CHECKOUT DETAILS ================= */}
        {screen === 'checkout' && (
          <div className="flex flex-col flex-1 p-4 space-y-4">
            
            {/* Header */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
              <button
                onClick={() => setScreen('cart')}
                className="p-1.5 bg-gray-200 rounded-lg text-gray-700 hover:bg-gray-300 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h3 className="font-extrabold text-sm text-gray-900">Informasi Pemesanan</h3>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              
              {/* Form details */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3.5 shadow-xs">
                <h4 className="text-xs font-extrabold uppercase text-red-600 tracking-wider">Lengkapi Kontak</h4>
                
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">Nama Pelanggan:</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none shadow-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-gray-600">No. WhatsApp Aktif:</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456789"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none shadow-xs"
                  />
                  <p className="text-[8px] text-gray-500 font-medium">Nomor ini digunakan untuk mengirimkan konfirmasi struk digital.</p>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3.5 shadow-xs">
                <h4 className="text-xs font-extrabold uppercase text-red-600 tracking-wider">Pilih Cara Pembayaran</h4>
                
                <div className="space-y-2">
                  
                  {/* QRIS method */}
                  <label className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'qris'
                      ? 'border-red-600 bg-red-50/50'
                      : 'border-gray-200 hover:bg-gray-50 bg-white shadow-xs'
                  }`}>
                    <input
                      type="radio"
                      name="payment_opt"
                      value="qris"
                      checked={paymentMethod === 'qris'}
                      onChange={() => setPaymentMethod('qris')}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      {/* Fake mini QRIS logo */}
                      <div className="w-10 h-7 bg-white rounded flex items-center justify-center font-bold font-mono text-[9px] text-[#002d62] border border-gray-200 shrink-0 shadow-xs">
                        QRIS
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">QRIS Instan Otomatis</span>
                        <span className="text-[9px] text-gray-500 font-medium">Pembayaran cashless langsung di tempat</span>
                      </div>
                    </div>
                    {paymentMethod === 'qris' && <Check className="w-4 h-4 text-red-600 stroke-[3px]" />}
                  </label>

                  {/* Cash Method */}
                  <label className={`border rounded-2xl p-3.5 flex items-center justify-between cursor-pointer transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-red-600 bg-red-50/50'
                      : 'border-gray-200 hover:bg-gray-50 bg-white shadow-xs'
                  }`}>
                    <input
                      type="radio"
                      name="payment_opt"
                      value="cash"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                      className="hidden"
                    />
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-7 bg-red-50 rounded flex items-center justify-center font-bold text-xs text-red-600 shrink-0 border border-red-100">
                        💵
                      </div>
                      <div>
                        <span className="text-xs font-bold text-gray-900 block">Bayar Cash di Kasir</span>
                        <span className="text-[9px] text-gray-500 font-medium font-medium">Pesan sekarang, bayar tunai di kasir utama</span>
                      </div>
                    </div>
                    {paymentMethod === 'cash' && <Check className="w-4 h-4 text-red-600 stroke-[3px]" />}
                  </label>

                </div>
              </div>

            </div>

            {/* Total recap and Order button */}
            <div className="mt-auto shrink-0 space-y-2">
              <div className="flex justify-between items-center px-2">
                <span className="text-xs text-gray-500 font-bold">Total Invoice:</span>
                <span className="text-base font-black font-mono text-red-600">{formatCurrency(getCartTotal() + settings.serviceFee)}</span>
              </div>
              <button
                onClick={() => handleCheckoutSubmit(false)}
                className="w-full bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black py-3 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                Buat Pesanan & Bayar <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        )}

        {/* ================= SCREEN: QRIS PAYER MODAL / VIEW ================= */}
        {screen === 'qris' && placedOrder && (
          <div className="flex flex-col flex-1 p-4 space-y-4 text-center">
            
            {/* Header */}
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">Gerbang Pembayaran QRIS</h3>
              <p className="text-[9px] text-gray-500 mt-0.5 font-medium">Pindai kode QR untuk menyelesaikan tagihan</p>
            </div>

            {/* Simulated QRIS QR box */}
            <div className="bg-white p-5 rounded-3xl mx-auto border-4 border-gray-100 max-w-[240px] text-gray-900 shadow-xl flex flex-col items-center">
              
              {/* QRIS logo label header */}
              <div className="flex justify-between items-center w-full mb-1 border-b border-gray-300 pb-1">
                <span className="font-mono font-black text-xs text-[#0a2342]">QRIS</span>
                <span className="text-[6px] text-gray-500 tracking-wider font-extrabold">GPN INDONESIA</span>
              </div>

              {/* QR content code canvas simulator */}
              <div className="w-40 h-40 bg-white rounded-xl p-1 flex items-center justify-center relative border border-gray-100 shadow-inner">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(generateQRISPayload(placedOrder.id, placedOrder.totalAmount))}`}
                  alt="QRIS Barcode"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Merchant metadata details */}
              <div className="text-center mt-2 w-full">
                <p className="font-extrabold text-[10px] text-gray-900 leading-none">{settings.shopName.toUpperCase()}</p>
                <p className="text-[7px] text-gray-500 font-mono mt-1 font-bold">NMID: ID10304686201</p>
              </div>

            </div>

            {/* Amount details */}
            <div className="bg-white p-3 rounded-2xl border border-gray-200 space-y-1 shadow-xs">
              <span className="text-[10px] text-gray-400 font-extrabold tracking-wider">TOTAL TAGIHAN</span>
              <p className="text-lg font-black font-mono text-red-600">{formatCurrency(placedOrder.totalAmount)}</p>
              <div className="text-[10px] text-gray-600 font-bold flex items-center justify-center gap-1.5 mt-1">
                <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-ping shrink-0" />
                Masa Berlaku QRIS: <span className="font-mono text-red-600 font-black">{formatTimer(qrisTimer)}</span>
              </div>
            </div>

            {/* Instruction and Simulation Helper buttons */}
            <div className="space-y-2 mt-auto shrink-0">
              <p className="text-[9px] text-gray-500 leading-relaxed font-medium">
                Silakan screenshot kode QR di atas lalu gunakan aplikasi e-wallet (GoPay, OVO, Dana, LinkAja) atau m-Banking Anda.
              </p>
              
              <button
                onClick={() => handleCheckoutSubmit(true)}
                className="w-full bg-green-600 hover:bg-green-700 active:scale-95 text-white font-black py-2.5 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                Simulasikan Pembayaran Sukses! 🎉
              </button>

              <button
                onClick={() => setScreen('checkout')}
                className="w-full text-center text-xs text-gray-500 hover:text-gray-900 py-1 underline font-extrabold transition-colors"
              >
                Kembali / Pilih Metode Lain
              </button>
            </div>

          </div>
        )}

        {/* ================= SCREEN: ORDER SUCCESS & TRACKER ================= */}
        {screen === 'success' && placedOrder && (
          <div className="flex flex-col flex-1 p-4 space-y-4 text-center">
            
            {/* Visual ticket check */}
            <div className="bg-red-50 border border-red-100 rounded-2xl p-5 space-y-2 max-w-[280px] mx-auto mt-2 shadow-xs">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center mx-auto text-white shadow-md animate-bounce">
                <Check className="w-6 h-6 stroke-[3px]" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-sm">Pesanan Diterima!</h3>
                <p className="text-[9px] text-gray-500 mt-0.5 font-bold">ID Transaksi: {placedOrder.id}</p>
              </div>
            </div>

            {/* Queue Number Ticket */}
            <div className="bg-white p-4 rounded-3xl border border-gray-200 relative shadow-sm">
              
              {/* Left/Right ticket notch decorative punches */}
              <div className="absolute top-1/2 -left-3 w-6 h-6 rounded-full bg-gray-50 border-r border-gray-200 -translate-y-1/2" />
              <div className="absolute top-1/2 -right-3 w-6 h-6 rounded-full bg-gray-50 border-l border-gray-200 -translate-y-1/2" />
              
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-extrabold">Nomor Antrean Anda</span>
              <h1 className="text-4xl font-black font-mono tracking-wider text-red-600 mt-1">#{placedOrder.orderNumber}</h1>
              
              <div className="border-t border-dashed border-gray-200 my-3.5 mx-4" />
              
              <div className="flex justify-between text-[10px] text-gray-500 font-mono px-4 font-bold">
                <span>Nama: {placedOrder.customerName}</span>
                <span>{placedOrder.isTakeaway ? 'TAKE AWAY' : `MEJA ${placedOrder.tableNumber}`}</span>
              </div>
            </div>

            {/* Realtime kitchen tracker */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200 space-y-3.5 shadow-xs">
              <h4 className="text-xs font-extrabold text-left text-gray-700 border-b border-gray-100 pb-1.5 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1 h-3 bg-red-600 rounded-full"></span> Lacak Proses Dapur
              </h4>
              
              <div className="flex justify-between items-center px-1">
                
                {/* Step 1: Diterima */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentOrderStatus === 'received' || currentOrderStatus === 'cooking' || currentOrderStatus === 'ready' || currentOrderStatus === 'completed'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    1
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold mt-1">Diterima</span>
                </div>

                {/* Line */}
                <div className={`flex-1 h-0.5 mx-2 ${
                  currentOrderStatus === 'cooking' || currentOrderStatus === 'ready' || currentOrderStatus === 'completed' ? 'bg-red-600' : 'bg-gray-200'
                }`} />

                {/* Step 2: Dimasak */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentOrderStatus === 'cooking' || currentOrderStatus === 'ready' || currentOrderStatus === 'completed'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    2
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold mt-1">Dimasak</span>
                </div>

                {/* Line */}
                <div className={`flex-1 h-0.5 mx-2 ${
                  currentOrderStatus === 'ready' || currentOrderStatus === 'completed' ? 'bg-red-600' : 'bg-gray-200'
                }`} />

                {/* Step 3: Siap */}
                <div className="flex flex-col items-center">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                    currentOrderStatus === 'ready' || currentOrderStatus === 'completed'
                      ? 'bg-green-600 text-white shadow-xs'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    3
                  </div>
                  <span className="text-[9px] text-gray-500 font-bold mt-1">Siap Saji</span>
                </div>

              </div>

              {/* Status explanation label */}
              <div className="bg-red-50 py-1.5 px-3 rounded-lg border border-red-100 text-[10px] text-red-600 font-mono font-bold text-center">
                {currentOrderStatus === 'received' && 'Status: Menunggu konfirmasi koki dapoer...'}
                {currentOrderStatus === 'cooking' && 'Status: Sedang dikukus & diracik dapoer...'}
                {currentOrderStatus === 'ready' && 'Status: PESANAN SIAP! Silakan ambil di konter.'}
                {currentOrderStatus === 'completed' && 'Status: Pesanan telah selesai disajikan.'}
              </div>
            </div>

            {/* Action buttons (WA notification send) */}
            <div className="mt-auto shrink-0 space-y-2">
              
              <button
                onClick={() => {
                  const msg = formatWhatsAppMessage(placedOrder, settings, true);
                  const waUrl = getWhatsAppURL(settings.whatsappNumber, msg);
                  window.open(waUrl, '_blank');
                }}
                className="w-full bg-[#25d366] hover:bg-[#20ba5a] text-white font-extrabold py-3 px-4 rounded-xl shadow-md transition-all text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4 fill-white" /> Kirim Pesanan ke WhatsApp Toko
              </button>

              <button
                onClick={() => {
                  setScreen('home');
                  setPlacedOrder(null);
                  resetCustomizer();
                }}
                className="w-full text-center text-xs text-red-600 hover:text-red-700 py-1.5 font-extrabold transition-colors"
              >
                Pesan Dimsum Lagi 🥟
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
