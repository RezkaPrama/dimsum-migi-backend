/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Order, MerchantSettings, SauceType } from './types';
import CustomerKiosk from './components/CustomerKiosk';
import MerchantDashboard from './components/MerchantDashboard';
import ThermalPrinter from './components/ThermalPrinter';
import { getMockOrders, DEFAULT_SETTINGS } from './utils/mockData';
import { playNewOrderChime } from './utils/audio';
import { Flame, Sparkles, ChefHat, Info, Laptop, Smartphone } from 'lucide-react';

export default function App() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<MerchantSettings>(DEFAULT_SETTINGS);
  
  // Track currently active order printing in the emulator
  const [activePrintedOrder, setActivePrintedOrder] = useState<Order | null>(null);

  // Available sauces stock checklist map
  const [availableSauces, setAvailableSauces] = useState<Record<SauceType, boolean>>({
    original: true,
    mentai: true,
    cheese: true,
    tartar: true
  });

  // State to track customer order statuses in real-time so CustomerKiosk updates instantly
  const [cookingStatuses, setCookingStatuses] = useState<Record<string, Order['orderStatus']>>({});

  // Initialize with some mock orders
  useEffect(() => {
    const mock = getMockOrders();
    setOrders(mock);
    
    // Store initial statuses
    const initialStatuses: Record<string, Order['orderStatus']> = {};
    mock.forEach(o => {
      initialStatuses[o.id] = o.orderStatus;
    });
    setCookingStatuses(initialStatuses);
  }, []);

  // Laravel API Real-Time Syncer
  useEffect(() => {
    if (!settings.laravelApiEnabled || !settings.laravelApiUrl) return;

    const fetchOrders = async () => {
      try {
        const response = await fetch(`${settings.laravelApiUrl}/api/orders`, {
          headers: {
            'Accept': 'application/json',
            ...(settings.laravelApiToken ? { 'Authorization': `Bearer ${settings.laravelApiToken}` } : {})
          }
        });
        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data)) {
            setOrders(data);
            
            // Sync statuses
            const statuses: Record<string, Order['orderStatus']> = {};
            data.forEach(o => {
              statuses[o.id] = o.orderStatus;
            });
            setCookingStatuses(statuses);
          }
        }
      } catch (err) {
        console.warn('Laravel API sync error. Is the Laravel server running?', err);
      }
    };

    // Fetch immediately and poll every 5 seconds
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [settings.laravelApiEnabled, settings.laravelApiUrl, settings.laravelApiToken]);

  // Customer submits order
  const handleOrderSubmit = async (newOrder: Order) => {
    // Play sweet order ding chime!
    if (settings.soundAlertEnabled) {
      playNewOrderChime();
    }

    if (settings.laravelApiEnabled && settings.laravelApiUrl) {
      try {
        const response = await fetch(`${settings.laravelApiUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(settings.laravelApiToken ? { 'Authorization': `Bearer ${settings.laravelApiToken}` } : {})
          },
          body: JSON.stringify(newOrder)
        });
        if (response.ok) {
          console.log('Order successfully sent to Laravel API!');
        } else {
          console.error('Laravel API failed to save order:', response.status);
        }
      } catch (err) {
        console.error('Failed to connect to Laravel API for order placement:', err);
      }
    }

    // Always keep local state updated as immediate optimistic UI
    setOrders(prev => [newOrder, ...prev]);
    
    // Track status
    setCookingStatuses(prev => ({
      ...prev,
      [newOrder.id]: newOrder.orderStatus
    }));

    // Trigger auto-print if enabled in shop settings
    if (settings.autoPrintReceipt) {
      // Small timeout to give visual space
      setTimeout(() => {
        setActivePrintedOrder(newOrder);
      }, 500);
    }
  };

  // Kitchen/Merchant updates order status
  const handleUpdateOrderStatus = async (orderId: string, status: Order['orderStatus']) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, orderStatus: status } : o));
    setCookingStatuses(prev => ({
      ...prev,
      [orderId]: status
    }));

    // Play chime on important updates
    if (status === 'ready' && settings.soundAlertEnabled) {
      playNewOrderChime();
    }

    if (settings.laravelApiEnabled && settings.laravelApiUrl) {
      try {
        await fetch(`${settings.laravelApiUrl}/api/orders/${orderId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(settings.laravelApiToken ? { 'Authorization': `Bearer ${settings.laravelApiToken}` } : {})
          },
          body: JSON.stringify({ orderStatus: status })
        });
      } catch (err) {
        console.error('Failed to update order status on Laravel API:', err);
      }
    }
  };

  // Kitchen/Merchant updates payment status (e.g. cash paid)
  const handleUpdatePaymentStatus = async (orderId: string, status: Order['paymentStatus']) => {
    // Optimistic UI update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentStatus: status, orderStatus: status === 'paid' ? 'received' : o.orderStatus } : o));
    
    if (status === 'paid') {
      setCookingStatuses(prev => ({
        ...prev,
        [orderId]: 'received'
      }));
    }

    if (settings.laravelApiEnabled && settings.laravelApiUrl) {
      try {
        await fetch(`${settings.laravelApiUrl}/api/orders/${orderId}/payment`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(settings.laravelApiToken ? { 'Authorization': `Bearer ${settings.laravelApiToken}` } : {})
          },
          body: JSON.stringify({ paymentStatus: status })
        });
      } catch (err) {
        console.error('Failed to update payment status on Laravel API:', err);
      }
    }
  };

  // Reprint / Print Trigger from POS
  const handleTriggerPrint = (order: Order) => {
    setActivePrintedOrder(order);
  };

  // Inventory Stock Toggle
  const handleToggleSauce = (sauce: SauceType) => {
    setAvailableSauces(prev => ({
      ...prev,
      [sauce]: !prev[sauce]
    }));
  };

  // Update whole settings
  const handleUpdateSettings = (newSettings: MerchantSettings) => {
    setSettings(newSettings);
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 selection:bg-red-500/20 selection:text-red-900 font-sans">
      
      {/* Dynamic Ambient Background Accents */}
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-red-600/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6 relative">
        
        {/* Responsive Header / Bar in Sleek Theme */}
        <header className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Red Box Logo representing "Dimsum Delight" from design */}
            <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center text-white font-black text-2xl shadow-md shrink-0">
              D
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded-lg text-[10px] font-extrabold border border-red-100 flex items-center gap-1">
                  <ChefHat className="w-3 h-3" /> DIMSUM DELIGHT SYSTEM
                </span>
                <span className="text-[10px] bg-green-50 text-green-600 border border-green-100 px-2 py-0.5 rounded-full font-mono font-bold animate-pulse">
                  ACTIVE • PRINTER ONLINE
                </span>
              </div>
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mt-1">
                Dimsum Self-Service Simulator <span className="text-red-600 text-sm font-bold ml-1">Bilingual v2.4</span>
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Simulasi end-to-end terintegrasi: <strong className="text-gray-800">Kiosk Pembelian</strong> + <strong className="text-gray-800">Dapur (KDS)</strong> + <strong className="text-gray-800">Thermal Printer (Bluetooth)</strong> + <strong className="text-gray-800">Notifikasi WhatsApp</strong>.
              </p>
            </div>
          </div>

          {/* Quick instructions indicator badge */}
          <div className="hidden lg:flex items-center gap-2.5 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 max-w-[340px]">
            <Info className="w-4 h-4 text-red-600 shrink-0" />
            <p className="text-[11px] text-gray-600 leading-normal font-medium">
              <strong>Tips Simulasi:</strong> Buat pesanan custom dimsum di panel HP (kiri), selesaikan bayar QRIS, maka dapur (kanan) otomatis berbunyi alarm & printer mencetak struk!
            </p>
          </div>
        </header>

        {/* Dynamic Simulator Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* COLUMN Left (4/12 width): iPhone-style Customer Kiosk App */}
          <div className="lg:col-span-4 flex flex-col items-center space-y-3 lg:sticky lg:top-6">
            
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-xs">
              <Smartphone className="w-3.5 h-3.5 text-red-600" /> Tampilan Kiosk / HP Pelanggan
            </div>

            <CustomerKiosk 
              settings={settings}
              onSubmitOrder={handleOrderSubmit}
              orders={orders}
              activeCookingStatuses={cookingStatuses}
              availableSauces={availableSauces}
            />
            
            <p className="text-[10px] text-gray-500 text-center max-w-[280px]">
              * Mockup mensimulasikan layar sentuh smartphone pelanggan atau tablet kiosk mandiri di meja restoran.
            </p>
          </div>

          {/* COLUMN Right (8/12 width): KDS Display panel, BLE Printer output and metrics dashboard */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Split row: KDS controller on left, Visual BLE thermal printer on right */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              
              {/* Visual Printer Emulator Column */}
              <div className="md:col-span-5 space-y-3 md:sticky md:top-6">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-xs justify-center">
                  <Laptop className="w-3.5 h-3.5 text-red-600" /> Output Thermal Printer
                </div>
                
                <ThermalPrinter 
                  activeOrder={activePrintedOrder}
                  settings={settings}
                  onClear={() => setActivePrintedOrder(null)}
                />
                
                <div className="bg-white rounded-2xl p-4 border border-gray-200 text-[10px] text-gray-600 space-y-1.5 shadow-xs">
                  <p className="font-extrabold text-gray-900 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span> Bluetooth BLE Auto-Print
                  </p>
                  <p className="leading-relaxed">
                    Printer di atas disimulasikan menggunakan <strong className="text-gray-900 font-semibold">Web Audio API</strong> untuk suara langkah motor stepper & printout gulir fisik. Klik "Print Physical" untuk menguji cetakan struk asli pada printer thermal 58mm Anda!
                  </p>
                </div>
              </div>

              {/* Chef KDS Queue Column */}
              <div className="md:col-span-7 space-y-3">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-gray-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-xs justify-center">
                  <ChefHat className="w-3.5 h-3.5 text-red-600" /> Kontrol Antrean Dapur & POS
                </div>

                <MerchantDashboard 
                  orders={orders}
                  settings={settings}
                  onUpdateSettings={handleUpdateSettings}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onUpdatePaymentStatus={handleUpdatePaymentStatus}
                  onTriggerPrint={handleTriggerPrint}
                  availableSauces={availableSauces}
                  onToggleSauce={handleToggleSauce}
                />
              </div>

            </div>

          </div>

        </div>

      </div>
      
    </div>
  );
}
