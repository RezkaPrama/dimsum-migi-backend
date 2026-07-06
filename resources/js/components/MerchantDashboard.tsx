/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Order, MerchantSettings, SauceType } from '../types';
import { formatCurrency, SAUCE_INFO, formatWhatsAppMessage, getWhatsAppURL } from '../utils/mockData';
import SalesAnalytics from './SalesAnalytics';
import { Play, Check, Send, Printer, RefreshCw, Layers, Sliders, BarChart3, Clock, Settings, Store, CheckSquare, X, Code, Copy, Globe, Key } from 'lucide-react';

interface MerchantDashboardProps {
  orders: Order[];
  settings: MerchantSettings;
  onUpdateSettings: (s: MerchantSettings) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['orderStatus']) => void;
  onUpdatePaymentStatus: (orderId: string, status: Order['paymentStatus']) => void;
  onTriggerPrint: (order: Order) => void;
  availableSauces: Record<SauceType, boolean>;
  onToggleSauce: (sauce: SauceType) => void;
}

export default function MerchantDashboard({
  orders,
  settings,
  onUpdateSettings,
  onUpdateOrderStatus,
  onUpdatePaymentStatus,
  onTriggerPrint,
  availableSauces,
  onToggleSauce
}: MerchantDashboardProps) {
  // Navigation Tabs: 'active' | 'completed' | 'analytics' | 'settings'
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'analytics' | 'settings'>('active');
  const [settingsSubTab, setSettingsSubTab] = useState<'basic' | 'integration'>('basic');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  
  // Settings edit state
  const [shopName, setShopName] = useState(settings.shopName);
  const [shopAddress, setShopAddress] = useState(settings.shopAddress);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [serviceFee, setServiceFee] = useState(settings.serviceFee.toString());

  // Laravel API Connection settings states
  const [laravelApiEnabled, setLaravelApiEnabled] = useState(settings.laravelApiEnabled);
  const [laravelApiUrl, setLaravelApiUrl] = useState(settings.laravelApiUrl);
  const [laravelApiToken, setLaravelApiToken] = useState(settings.laravelApiToken);

  // WhatsApp connection states
  const [whatsappMode, setWhatsappMode] = useState(settings.whatsappMode);
  const [whatsappGatewayUrl, setWhatsappGatewayUrl] = useState(settings.whatsappGatewayUrl);
  const [whatsappGatewayToken, setWhatsappGatewayToken] = useState(settings.whatsappGatewayToken);

  // Success notice state instead of native alert
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      ...settings,
      shopName,
      shopAddress,
      whatsappNumber,
      serviceFee: parseInt(serviceFee) || 0,
      laravelApiEnabled,
      laravelApiUrl,
      laravelApiToken,
      whatsappMode,
      whatsappGatewayUrl,
      whatsappGatewayToken
    });
    showToast('Pengaturan toko & integrasi berhasil disimpan!');
  };

  // Filter orders
  const activeOrders = orders.filter(o => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled');
  const completedOrders = orders.filter(o => o.orderStatus === 'completed');

  return (
    <div id="merchant_dashboard" className="bg-gray-100 border border-gray-200 rounded-3xl p-5 shadow-xl flex flex-col h-[780px] text-gray-800 relative">
      
      {/* Sleek Custom Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-[100] bg-gray-950 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-lg border border-gray-800 flex items-center gap-2 animate-bounce">
          <CheckSquare className="w-4 h-4 text-green-500" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-1 text-gray-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top dashboard header with logo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-200 pb-4 mb-4 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white text-lg font-bold shadow-xs">
            🍽️
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              KDS & Merchant Portal <span className="text-[10px] bg-red-50 border border-red-100 text-red-600 font-mono px-2 py-0.5 rounded-full font-black tracking-wider uppercase">MASTER HUB</span>
            </h1>
            <p className="text-xs text-gray-500 font-medium">{settings.shopName} - Panel Administrasi Dapur</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-1.5 bg-gray-200/80 p-1 rounded-xl border border-gray-300/40 w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'active'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Antrean ({activeOrders.length})
          </button>
          
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'completed'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> History ({completedOrders.length})
          </button>
          
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'analytics'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" /> Analitik
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-extrabold transition-all whitespace-nowrap uppercase tracking-wider ${
              activeTab === 'settings'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" /> Set Toko
          </button>
        </div>
      </div>

      {/* Main Panel Content Area */}
      <div className="flex-1 overflow-y-auto pr-1">
        
        {/* ================= TAB: ACTIVE KITCHEN QUEUE ================= */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            
            {activeOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
                <Store className="w-16 h-16 text-gray-300 mb-3" />
                <h3 className="font-extrabold text-gray-800">Belum Ada Antrean Masuk</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[280px] font-medium">Silakan kirimkan pesanan baru menggunakan Emulator Kiosk Pelanggan di sebelah kiri.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeOrders.map((order) => {
                  const orderDate = new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`border p-4 rounded-2xl flex flex-col justify-between transition-all relative overflow-hidden bg-white shadow-xs ${
                        order.orderStatus === 'ready' 
                          ? 'border-green-500 shadow-[0_4px_12px_rgba(34,197,94,0.08)] bg-green-50/20'
                          : order.orderStatus === 'cooking'
                          ? 'border-amber-500 bg-amber-50/10'
                          : 'border-gray-200'
                      }`}
                    >
                      {/* Top metadata info */}
                      <div className="flex justify-between items-start border-b border-gray-100 pb-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-red-600 font-mono">#{order.orderNumber}</span>
                            <span className={`text-[9px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded-full border ${
                              order.isTakeaway 
                                ? 'bg-red-50 text-red-600 border-red-100' 
                                : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                              {order.isTakeaway ? 'TakeAway' : `Meja ${order.tableNumber}`}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 font-bold">Nama: <strong className="text-gray-900">{order.customerName}</strong></p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-gray-400 font-mono font-bold">{orderDate}</span>
                          <span className={`block text-[10px] font-black font-mono mt-0.5 ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-red-600'}`}>
                            {order.paymentStatus === 'paid' ? 'LUNAS (QRIS)' : 'CASH (BELUM BAYAR)'}
                          </span>
                        </div>
                      </div>

                      {/* Items details */}
                      <div className="space-y-2.5 mb-4 flex-1">
                        {order.items.map((item, idx) => {
                          const sauceCounts = item.pieceSauces.reduce((acc, s) => {
                            acc[s] = (acc[s] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>);

                          const sauceText = Object.entries(sauceCounts)
                            .map(([s, c]) => `${c}x ${SAUCE_INFO[s as SauceType].name.split(' ')[1]}`)
                            .join(', ');

                          return (
                            <div key={idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-200/80 text-xs">
                              <div className="flex justify-between font-extrabold text-gray-900 mb-1">
                                <span>Dimsum {item.size === 'small' ? 'Small (3 pcs)' : 'Medium (6 pcs)'}</span>
                                <span className="font-mono text-gray-500 font-bold">x{item.quantity}</span>
                              </div>
                              <p className="text-gray-600 text-[11px] leading-tight mt-1 font-semibold">
                                🥣 Saus: <strong className="text-red-600 font-bold">{sauceText}</strong>
                              </p>
                              
                              {item.extraSauces.length > 0 && (
                                <p className="text-[10px] text-red-600 font-bold mt-1">
                                  + Cup Extra: {item.extraSauces.map(es => `${SAUCE_INFO[es.sauce].name.split(' ')[1]} (x${es.quantity})`).join(', ')}
                                </p>
                              )}

                              {item.notes && (
                                <div className="mt-1.5 bg-amber-50 border border-amber-200/60 rounded-lg px-2 py-1 inline-block text-[10px] text-amber-800 font-bold font-sans">
                                  Catatan: "{item.notes}"
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Payment Status Adjuster for Cash orders */}
                      {order.paymentStatus === 'unpaid' && (
                        <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-xs flex justify-between items-center mb-3 shadow-xs">
                          <span className="text-amber-800 font-extrabold">Bayar Tunai di Kasir</span>
                          <button
                            onClick={() => {
                              onUpdatePaymentStatus(order.id, 'paid');
                              showToast(`Pembayaran #${order.orderNumber} berhasil dilunasi!`);
                            }}
                            className="bg-amber-600 hover:bg-amber-700 text-white font-black py-1 px-2.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                          >
                            Tandai Lunas
                          </button>
                        </div>
                      )}

                      {/* Operational Action Buttons */}
                      <div className="border-t border-gray-100 pt-3 flex flex-wrap gap-2 justify-between items-center">
                        
                        <div className="text-xs font-mono font-black text-gray-500">
                          Total: <span className="text-red-600 text-sm">{formatCurrency(order.totalAmount)}</span>
                        </div>

                        <div className="flex gap-1.5">
                          {/* Printer Trigger */}
                          <button
                            onClick={() => {
                              onTriggerPrint(order);
                              showToast(`Struk #${order.orderNumber} dikirim ke bluetooth printer!`);
                            }}
                            title="Cetak Struk"
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-red-600 hover:text-red-700 rounded-lg border border-gray-200 transition-all shadow-xs"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {/* Order ready notify WA */}
                          {order.orderStatus === 'cooking' && (
                            <button
                              onClick={() => {
                                const msg = formatWhatsAppMessage(order, settings, false);
                                const url = getWhatsAppURL(order.customerPhone, msg);
                                window.open(url, '_blank');
                                showToast(`Notifikasi dikirim ke WA pelanggan!`);
                              }}
                              title="Kirim Notifikasi WA Siap Saji"
                              className="p-1.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg border border-green-200 transition-all shadow-xs"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          )}

                          {/* Phase advancement state controller */}
                          {order.orderStatus === 'received' && (
                            <button
                              onClick={() => {
                                onUpdateOrderStatus(order.id, 'cooking');
                                showToast(`Order #${order.orderNumber} mulai dimasak!`);
                              }}
                              className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black py-1.5 px-3 rounded-lg transition-all shadow-xs uppercase tracking-wider"
                            >
                              <Play className="w-3 h-3 fill-white" /> Masak
                            </button>
                          )}

                          {order.orderStatus === 'cooking' && (
                            <button
                              onClick={() => {
                                onUpdateOrderStatus(order.id, 'ready');
                                // Trigger print automatically on ready as a chef helper
                                onTriggerPrint(order);
                                showToast(`Order #${order.orderNumber} SIAP SAJI! Struk dicetak.`);
                              }}
                              className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white text-xs font-black py-1.5 px-3 rounded-lg transition-all shadow-xs uppercase tracking-wider"
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3px]" /> Siap Saji
                            </button>
                          )}

                          {order.orderStatus === 'ready' && (
                            <button
                              onClick={() => {
                                onUpdateOrderStatus(order.id, 'completed');
                                showToast(`Order #${order.orderNumber} selesai disajikan.`);
                              }}
                              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white text-xs font-black py-1.5 px-3 rounded-lg transition-all shadow-xs uppercase tracking-wider"
                            >
                              Selesaikan Antrean
                            </button>
                          )}
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ================= TAB: COMPLETED ARCHIVE HISTORY ================= */}
        {activeTab === 'completed' && (
          <div className="space-y-4">
            
            {completedOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-20 text-gray-400">
                <Store className="w-16 h-16 text-gray-300 mb-3" />
                <h3 className="font-extrabold text-gray-800">Belum Ada Riwayat Selesai</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-[280px] font-medium">Selesaikan antrean aktif di tab utama agar riwayat pembayaran terekam di sini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-200 text-gray-700 uppercase font-extrabold text-[10px]">
                    <tr>
                      <th className="p-3 rounded-l-lg">ID</th>
                      <th className="p-3">Nama</th>
                      <th className="p-3">Tipe</th>
                      <th className="p-3">Item</th>
                      <th className="p-3">Metode</th>
                      <th className="p-3">Total</th>
                      <th className="p-3 rounded-r-lg text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedOrders.map((order) => {
                      const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
                      const orderDate = new Date(order.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

                      return (
                        <tr key={order.id} className="border-b border-gray-200 hover:bg-white bg-gray-50/50 transition-all font-semibold text-gray-800">
                          <td className="p-3 font-mono font-extrabold text-red-600">#{order.orderNumber}</td>
                          <td className="p-3 font-extrabold text-gray-900">{order.customerName}</td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              order.isTakeaway 
                                ? 'bg-red-50 text-red-600 border border-red-100' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {order.isTakeaway ? 'TakeAway' : `Meja ${order.tableNumber}`}
                            </span>
                          </td>
                          <td className="p-3 text-gray-500">{totalItems} item</td>
                          <td className="p-3 font-mono uppercase text-[10px] font-bold">{order.paymentMethod}</td>
                          <td className="p-3 font-mono font-black text-gray-900">{formatCurrency(order.totalAmount)}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => {
                                onTriggerPrint(order);
                                showToast(`Struk #${order.orderNumber} dikirim ulang ke printer.`);
                              }}
                              className="text-xs text-red-600 hover:text-red-700 font-extrabold underline flex items-center gap-1 justify-end ml-auto transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" /> Re-Print
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}

        {/* ================= TAB: SALES ANALYTICS ================= */}
        {activeTab === 'analytics' && (
          <SalesAnalytics orders={orders} />
        )}

        {/* ================= TAB: CONFIGURATION SETTINGS ================= */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Sub-tab Selection */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setSettingsSubTab('basic')}
                className={`py-2.5 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  settingsSubTab === 'basic'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                🏠 Dasar & Stok Saus
              </button>
              <button
                onClick={() => setSettingsSubTab('integration')}
                className={`py-2.5 px-5 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
                  settingsSubTab === 'integration'
                    ? 'border-red-600 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                ⚙️ Integrasi Laravel & WhatsApp Gateway
              </button>
            </div>

            {settingsSubTab === 'basic' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Store Information Form */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
                  <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2 uppercase flex items-center gap-2">
                    <Store className="w-4 h-4 text-red-600" /> Informasi Outlet Utama
                  </h3>
                  
                  <form onSubmit={handleSaveSettings} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600">Nama Toko / Outlet:</label>
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none shadow-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600">Alamat Outlet:</label>
                      <input
                        type="text"
                        required
                        value={shopAddress}
                        onChange={(e) => setShopAddress(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none shadow-xs font-semibold"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600">WhatsApp Merchant (Penerima Order):</label>
                      <input
                        type="text"
                        required
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none shadow-xs font-semibold"
                      />
                      <p className="text-[9px] text-gray-400 font-bold">Isi dengan kode negara tanpa +, contoh: 6281234567890</p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-600">Biaya Layanan (Service Fee):</label>
                      <input
                        type="number"
                        required
                        value={serviceFee}
                        onChange={(e) => setServiceFee(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 focus:outline-none shadow-xs font-mono font-bold"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2.5 rounded-xl text-xs uppercase shadow-sm transition-all tracking-widest"
                    >
                      Simpan Pengaturan
                    </button>
                  </form>
                </div>

                {/* Inventory / Sauce Stock Controls */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs">
                  <h3 className="text-sm font-extrabold text-gray-900 border-b border-gray-100 pb-2 uppercase flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-red-600" /> Manajemen Stok Bahan / Saus
                  </h3>
                  
                  <p className="text-[11px] text-gray-500 leading-normal font-semibold">
                    Gunakan panel di bawah ini untuk mensimulasikan kehabisan stok saus di dapur. Pilihan saus yang dinonaktifkan di sini akan otomatis ter-update dan tidak bisa dipilih oleh pelanggan di Kiosk.
                  </p>

                  <div className="space-y-3.5 pt-2">
                    {(Object.keys(SAUCE_INFO) as SauceType[]).map((sauceId) => {
                      const sInfo = SAUCE_INFO[sauceId];
                      const isAvailable = availableSauces[sauceId];

                      return (
                        <div 
                          key={sauceId} 
                          className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                            isAvailable 
                              ? 'bg-gray-50 border-gray-200/80 shadow-xs' 
                              : 'bg-red-50/50 border-red-200/60'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className={`w-3 h-3 rounded-full ${sInfo.bgColor} ${sInfo.textColor}`} style={{ backgroundColor: sInfo.color }} />
                            <div>
                              <span className="text-xs font-extrabold text-gray-900 block">{sInfo.name}</span>
                              <span className="text-[9px] text-gray-500 font-bold">Custom saus per butir dimsum</span>
                            </div>
                          </div>

                          <button
                            onClick={() => {
                              onToggleSauce(sauceId);
                              showToast(`Stok saus ${sInfo.name.split(' ')[1]} diperbarui.`);
                            }}
                            className={`text-xs font-extrabold px-3 py-1.5 rounded-lg border transition-all shadow-xs ${
                              isAvailable
                                ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {isAvailable ? '✅ Tersedia' : '❌ Kosong / Habis'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Integration Configurations */}
                <div className="space-y-4">
                  {/* Laravel API Connection Settings */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs text-left">
                    <h3 className="text-sm font-extrabold text-gray-950 border-b border-gray-100 pb-2 uppercase flex items-center gap-2">
                      <Globe className="w-4 h-4 text-red-600" /> Koneksi Laravel API Backend
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-gray-700">Gunakan Laravel API:</label>
                        <button
                          type="button"
                          onClick={() => setLaravelApiEnabled(!laravelApiEnabled)}
                          className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                            laravelApiEnabled ? 'bg-red-600' : 'bg-gray-300'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              laravelApiEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-600">Laravel API Base URL:</label>
                        <input
                          type="text"
                          disabled={!laravelApiEnabled}
                          value={laravelApiUrl}
                          onChange={(e) => setLaravelApiUrl(e.target.value)}
                          placeholder="e.g. http://127.0.0.1:8000"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-950 font-mono disabled:opacity-50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-gray-600">API Bearer Token (Opsional):</label>
                        <input
                          type="password"
                          disabled={!laravelApiEnabled}
                          value={laravelApiToken}
                          onChange={(e) => setLaravelApiToken(e.target.value)}
                          placeholder="Masukkan token jika API dilindungi Sanctum/Passport"
                          className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-950 font-mono disabled:opacity-50"
                        />
                      </div>

                      {laravelApiEnabled && (
                        <button
                          type="button"
                          onClick={async () => {
                            showToast('Menghubungkan ke API...');
                            try {
                              const testUrl = `${laravelApiUrl}/api/orders`;
                              const res = await fetch(testUrl, {
                                method: 'GET',
                                headers: { 'Accept': 'application/json' }
                              });
                              if (res.ok) {
                                showToast('✅ Berhasil terhubung ke Laravel API!');
                              } else {
                                showToast(`❌ Gagal terhubung: Server mengembalikan status ${res.status}`);
                              }
                            } catch (e: any) {
                              showToast('❌ Gagal terhubung! Pastikan backend Laravel Anda aktif.');
                            }
                          }}
                          className="w-full py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black uppercase tracking-wider rounded-xl border border-gray-200 transition-colors"
                        >
                          Tes Koneksi API
                        </button>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp Gateway Config */}
                  <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs text-left">
                    <h3 className="text-sm font-extrabold text-gray-950 border-b border-gray-100 pb-2 uppercase flex items-center gap-2">
                      <Send className="w-4 h-4 text-green-600" /> WhatsApp Gateway Otomatis
                    </h3>

                    <div className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">Mode Notifikasi WhatsApp:</label>
                        <select
                          value={whatsappMode}
                          onChange={(e: any) => setWhatsappMode(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-900 font-semibold"
                        >
                          <option value="direct">Direct (WhatsApp Web Client/App Link)</option>
                          <option value="fonnte">Fonnte (Gateway API Langsung)</option>
                          <option value="laravel">Laravel (Didelegasikan ke Backend API)</option>
                        </select>
                      </div>

                      {whatsappMode === 'fonnte' && (
                        <>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-600">Fonnte API Token:</label>
                            <input
                              type="password"
                              value={whatsappGatewayToken}
                              onChange={(e) => setWhatsappGatewayToken(e.target.value)}
                              placeholder="Masukkan token Fonnte Anda"
                              className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-950 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-gray-600">Fonnte API Send URL:</label>
                            <input
                              type="text"
                              value={whatsappGatewayUrl}
                              onChange={(e) => setWhatsappGatewayUrl(e.target.value)}
                              placeholder="https://api.fonnte.com/send"
                              className="w-full bg-gray-50 border border-gray-200 focus:border-red-600 rounded-xl px-3 py-2 text-xs text-gray-950 font-mono"
                            />
                          </div>
                        </>
                      )}

                      {whatsappMode === 'laravel' && (
                        <p className="text-[10px] text-gray-500 leading-normal font-semibold bg-gray-50 p-2.5 rounded-lg border">
                          💡 Aplikasi akan memanggil POST ke <code>{laravelApiUrl || 'http://localhost:8000'}/api/whatsapp/send</code>. Backend Laravel Anda bertanggung jawab meneruskan pesan ke gateway pilihan Anda.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-2 rounded-xl text-xs uppercase shadow-sm transition-all tracking-widest"
                      >
                        Simpan Integrasi
                      </button>
                    </div>
                  </div>
                </div>

                {/* Laravel Code Blueprint & Guides */}
                <div className="bg-white p-5 rounded-2xl border border-gray-200 space-y-4 shadow-xs text-left h-[590px] flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-extrabold text-gray-950 border-b border-gray-100 pb-2 uppercase flex items-center gap-2">
                      <Code className="w-4 h-4 text-indigo-600" /> Blueprint Controller Laravel
                    </h3>
                    <p className="text-[10px] text-gray-500 font-medium leading-relaxed mt-1">
                      Salin kode berikut untuk membuat API di server Laravel Anda secara instan. Ini akan menerima data order dari Kiosk & menyinkronkannya dengan KDS secara real-time!
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto my-3 p-3 bg-gray-900 rounded-xl font-mono text-[9px] text-gray-200 space-y-4 select-all relative scrollbar-thin">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`
// 1. Tambahkan di routes/api.php
use App\\Http\\Controllers\\Api\\OrderController;

Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', [OrderController::class, 'store']);
Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
Route::put('/orders/{id}/payment', [OrderController::class, 'updatePayment']);
Route::post('/whatsapp/send', [OrderController::class, 'sendWhatsapp']);

// 2. File Controller: app/Http/Controllers/Api/OrderController.php
namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Cache;
use Illuminate\\Support\\Facades\\Http;

class OrderController extends Controller
{
    // Fetch all active orders
    public function index() {
        return response()->json(Cache::get('orders', []));
    }

    // Save a new order
    public function store(Request $request) {
        $orders = Cache::get('orders', []);
        $newOrder = $request->all();
        
        // Push new order to front of the stack
        array_unshift($orders, $newOrder);
        Cache::put('orders', $orders, now()->addDays(7));

        // Optional Automated WhatsApp integration inside Laravel
        $this->dispatchWhatsapp($newOrder['customerPhone'], "Pesanan #\${$newOrder['orderNumber']} Anda diterima!");

        return response()->json(['status' => 'success', 'order' => $newOrder], 201);
    }

    // Update order cooking phase
    public function updateStatus($id, Request $request) {
        $orders = Cache::get('orders', []);
        $orders = array_map(function($o) use ($id, $request) {
            if ($o['id'] == $id) {
                $o['orderStatus'] = $request->input('orderStatus');
            }
            return $o;
        }, $orders);
        Cache::put('orders', $orders);
        return response()->json(['status' => 'success']);
    }

    // Update cash payment completion
    public function updatePayment($id, Request $request) {
        $orders = Cache::get('orders', []);
        $orders = array_map(function($o) use ($id, $request) {
            if ($o['id'] == $id) {
                $o['paymentStatus'] = $request->input('paymentStatus');
                if ($request->input('paymentStatus') === 'paid') {
                    $o['orderStatus'] = 'received';
                }
            }
            return $o;
        }, $orders);
        Cache::put('orders', $orders);
        return response()->json(['status' => 'success']);
    }

    // WhatsApp handler custom proxy
    public function sendWhatsapp(Request $request) {
        $phone = $request->input('phone');
        $message = $request->input('message');
        $this->dispatchWhatsapp($phone, $message);
        return response()->json(['status' => 'sent']);
    }

    private function dispatchWhatsapp($phone, $message) {
        // Example Fonnte gateway call from Laravel
        Http::withHeaders([
            'Authorization' => 'YOUR_FONNTE_TOKEN_HERE'
        ])->post('https://api.fonnte.com/send', [
            'target' => $phone,
            'message' => $message
        ]);
    }
}
                        `.trim());
                        setCopiedSection('laravel');
                        setTimeout(() => setCopiedSection(null), 2000);
                      }}
                      className="absolute top-2 right-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[8px] tracking-wider uppercase px-2 py-1 rounded flex items-center gap-1 transition-all"
                    >
                      <Copy className="w-3 h-3" /> {copiedSection === 'laravel' ? 'Berhasil Salin!' : 'Salin Kode'}
                    </button>
                    <pre className="whitespace-pre-wrap select-all">
{`// 1. Tambahkan di routes/api.php
use App\\Http\\Controllers\\Api\\OrderController;

Route::get('/orders', [OrderController::class, 'index']);
Route::post('/orders', [OrderController::class, 'store']);
Route::put('/orders/{id}/status', [OrderController::class, 'updateStatus']);
Route::put('/orders/{id}/payment', [OrderController::class, 'updatePayment']);
Route::post('/whatsapp/send', [OrderController::class, 'sendWhatsapp']);

// 2. Controller Laravel:
// app/Http/Controllers/Api/OrderController.php
namespace App\\Http\\Controllers\\Api;

use App\\Http\\Controllers\\Controller;
use Illuminate\\Http\\Request;
use Illuminate\\Support\\Facades\\Cache;
use Illuminate\\Support\\Facades\\Http;

class OrderController extends Controller {
    public function index() {
        return response()->json(Cache::get('orders', []));
    }

    public function store(Request $request) {
        $orders = Cache::get('orders', []);
        $newOrder = $request->all();
        array_unshift($orders, $newOrder);
        Cache::put('orders', $orders, now()->addDays(7));
        return response()->json(['status' => 'success'], 201);
    }
}`}
                    </pre>
                  </div>

                  <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-xl text-[10px] text-indigo-800 font-medium leading-relaxed">
                    💡 <strong>Tips Laravel:</strong> Cache digunakan sebagai media penyimpanan cepat (In-Memory). Jika ingin menggunakan database relational, Anda bisa membuat database migration untuk tabel <code>orders</code> dan <code>order_items</code>, lalu menggunakan Eloquent ORM di controller Anda!
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
