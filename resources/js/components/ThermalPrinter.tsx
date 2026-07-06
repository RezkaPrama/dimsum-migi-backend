/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from 'react';
import { Order, MerchantSettings } from '../types';
import { formatCurrency, SAUCE_INFO } from '../utils/mockData';
import { playPrinterStepperSound, playPaperTearSound } from '../utils/audio';
import { Printer, Check, Wifi, Trash2, PrinterCheck, AlertCircle, WifiOff } from 'lucide-react';

interface ThermalPrinterProps {
  activeOrder: Order | null;
  settings: MerchantSettings;
  onClear: () => void;
}

export default function ThermalPrinter({ activeOrder, settings, onClear }: ThermalPrinterProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [printHeight, setPrintHeight] = useState(0); // For animating receipt sliding out
  const [isTorn, setIsTorn] = useState(false);

  // Bluetooth Printer Connection State
  const [bleDevice, setBleDevice] = useState<any>(null);
  const [bleCharacteristic, setBleCharacteristic] = useState<any>(null);
  const [bleConnectionState, setBleConnectionState] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [bleErrorMessage, setBleErrorMessage] = useState('');

  useEffect(() => {
    if (activeOrder) {
      // Trigger new print job
      setIsPrinting(true);
      setIsTorn(false);
      setPrintHeight(0);
      
      const duration = 2000; // 2 seconds print time
      playPrinterStepperSound(duration);

      // Animate sliding out
      let start: number | null = null;
      const animate = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const percentage = Math.min(progress / duration, 1);
        setPrintHeight(percentage * 100);
        
        if (percentage < 1) {
          requestAnimationFrame(animate);
        } else {
          setIsPrinting(false);
          // If Bluetooth printer is active, print automatically
          if (bleCharacteristic) {
            printToBluetooth(activeOrder);
          }
        }
      };
      requestAnimationFrame(animate);
    }
  }, [activeOrder, bleCharacteristic]);

  const handleTear = () => {
    if (isPrinting) return;
    setIsTorn(true);
    playPaperTearSound();
  };

  // Convert text and structures to ESC/POS commands
  const generateEscPosData = (order: Order, settings: MerchantSettings): Uint8Array => {
    const encoder = new TextEncoder();
    const bytes: number[] = [];

    // ESC/POS Commands
    const INIT = [0x1B, 0x40];
    const ALIGN_CENTER = [0x1B, 0x61, 0x01];
    const ALIGN_LEFT = [0x1B, 0x61, 0x00];
    const BOLD_ON = [0x1B, 0x45, 0x01];
    const BOLD_OFF = [0x1B, 0x45, 0x00];
    const DOUBLE_SIZE = [0x1D, 0x21, 0x11]; // Double height and width
    const NORMAL_SIZE = [0x1D, 0x21, 0x00];
    const DASHED_LINE = encoder.encode('--------------------------------\n'); // 32 chars standard for 58mm printer

    const addText = (text: string) => {
      const encoded = encoder.encode(text);
      for (let i = 0; i < encoded.length; i++) {
        bytes.push(encoded[i]);
      }
    };

    const addCmd = (cmd: number[]) => {
      bytes.push(...cmd);
    };

    // Begin ESC/POS formatting
    addCmd(INIT);
    addCmd(ALIGN_CENTER);
    addCmd(BOLD_ON);
    addCmd(DOUBLE_SIZE);
    addText(settings.shopName.toUpperCase() + '\n');
    addCmd(NORMAL_SIZE);
    addCmd(BOLD_OFF);
    addText(settings.shopAddress + '\n');
    addText(`WhatsApp: ${settings.whatsappNumber}\n`);
    addCmd(ALIGN_LEFT);
    bytes.push(...DASHED_LINE);

    // Order Header
    addCmd(BOLD_ON);
    addText(`ANTREAN: #${order.orderNumber}\n`);
    addCmd(BOLD_OFF);
    addText(`ID: ${order.id}\n`);
    const orderDate = new Date(order.createdAt).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    addText(`Tanggal: ${orderDate}\n`);
    addText(`Layanan: ${order.isTakeaway ? 'TAKE AWAY' : 'DINE IN (Meja ' + (order.tableNumber || '-') + ')'}\n`);
    bytes.push(...DASHED_LINE);

    // Items Column Header
    addCmd(BOLD_ON);
    addText('Menu          Qty          Harga\n');
    addCmd(BOLD_OFF);
    bytes.push(...DASHED_LINE);

    // Items list
    order.items.forEach(item => {
      const sCounts = item.pieceSauces.reduce((acc, s) => {
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const sauceLine = Object.entries(sCounts)
        .map(([sauce, count]) => `${count}${sauce.charAt(0).toUpperCase()}`)
        .join('/');

      // Alignment padding logic for 32 character ESC/POS limit
      const itemName = `Dimsum ${item.size === 'small' ? 'Sm' : 'Med'}`;
      const qtyStr = `x${item.quantity}`;
      const priceStr = formatCurrency(item.totalPrice).replace('Rp ', '');

      const col1 = itemName.padEnd(14, ' ').substring(0, 14);
      const col2 = qtyStr.padStart(5, ' ').substring(0, 5);
      const col3 = priceStr.padStart(13, ' ').substring(0, 13);

      addText(`${col1}${col2}${col3}\n`);
      addText(`  Saus: ${sauceLine}\n`);
      if (item.extraSauces.length > 0) {
        addText(`  +Cup: ${item.extraSauces.map(es => es.sauce.toUpperCase()).join('/')}\n`);
      }
      if (item.notes) {
        addText(`  Catat: "${item.notes}"\n`);
      }
    });

    bytes.push(...DASHED_LINE);

    // Total section
    const subtotalStr = formatCurrency(order.subtotal).replace('Rp ', '');
    const svcStr = formatCurrency(settings.serviceFee).replace('Rp ', '');
    const totalStr = formatCurrency(order.totalAmount).replace('Rp ', '');

    addText(`Subtotal:     ${subtotalStr.padStart(18, ' ')}\n`);
    addText(`Svc Fee:      ${svcStr.padStart(18, ' ')}\n`);
    addCmd(BOLD_ON);
    addText(`TOTAL:        ${totalStr.padStart(18, ' ')}\n`);
    addCmd(BOLD_OFF);
    bytes.push(...DASHED_LINE);

    // Payment details
    addCmd(BOLD_ON);
    addText(`Metode: ${order.paymentMethod.toUpperCase()}\n`);
    addText(`Status: ${order.paymentStatus === 'paid' ? 'LUNAS' : 'BELUM BAYAR'}\n`);
    addCmd(BOLD_OFF);
    bytes.push(...DASHED_LINE);

    // Footer spacing
    addCmd(ALIGN_CENTER);
    addCmd(BOLD_ON);
    addText('TERIMAKASIH BANYAK\n');
    addCmd(BOLD_OFF);
    addText('Silakan berkunjung kembali!\n\n\n\n\n'); // Spacing to allow manual cutting

    // Paper Cut Command
    addCmd([0x1D, 0x56, 0x42, 0x00]);

    return new Uint8Array(bytes);
  };

  // Dynamic Web Bluetooth pairing
  const handleConnectBluetooth = async () => {
    setBleConnectionState('connecting');
    setBleErrorMessage('');
    try {
      if (!(navigator as any).bluetooth) {
        throw new Error('Web Bluetooth tidak didukung di browser ini. Gunakan Chrome/Edge.');
      }

      // Scan and request for any Bluetooth device offering generic Serial or common Printer GATT service
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Chinese portables common
          'e7e11202-0000-1000-8000-00805f9b34fb', // Rongta / SPRT printers
          '0000e7e1-0000-1000-8000-00805f9b34fb'
        ]
      });

      const server = await device.gatt.connect();
      
      // Look for the writable characteristic dynamically across services
      const services = await server.getPrimaryServices();
      let writeChar: any = null;

      for (const service of services) {
        try {
          const characteristics = await service.getCharacteristics();
          for (const char of characteristics) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
        } catch (e) {
          console.warn('Skipping service characteristics discovery:', e);
        }
        if (writeChar) break;
      }

      if (!writeChar) {
        throw new Error('Karakteristik penulisan ESC/POS tidak ditemukan di printer ini.');
      }

      setBleDevice(device);
      setBleCharacteristic(writeChar);
      setBleConnectionState('connected');

      // Setup auto-disconnect listener
      device.addEventListener('gattserverdisconnected', () => {
        setBleDevice(null);
        setBleCharacteristic(null);
        setBleConnectionState('disconnected');
      });

    } catch (err: any) {
      console.error(err);
      setBleConnectionState('error');
      setBleErrorMessage(err.message || 'Bluetooth connection failed.');
    }
  };

  const handleDisconnectBluetooth = () => {
    if (bleDevice && bleDevice.gatt?.connected) {
      bleDevice.gatt.disconnect();
    }
    setBleDevice(null);
    setBleCharacteristic(null);
    setBleConnectionState('disconnected');
  };

  // Write commands to Bluetooth device
  const printToBluetooth = async (order: Order) => {
    if (!bleCharacteristic) return;
    try {
      const data = generateEscPosData(order, settings);
      
      // Standard BLE MTU chunking size is 20 bytes
      const chunkSize = 20;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await bleCharacteristic.writeValue(chunk);
        // Small delay for thermal buffer integration
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    } catch (err: any) {
      console.error('Failed to print to bluetooth device:', err);
      alert('Gagal mencetak ke printer bluetooth: ' + err.message);
    }
  };

  const handleBrowserPrint = () => {
    if (!activeOrder) return;
    
    const printContent = document.getElementById('thermal-receipt-print-area')?.innerHTML;
    if (!printContent) return;

    const printWindow = window.open('', '_blank', 'width=350,height=600');
    if (!printWindow) {
      alert('Mohon izinkan pop-up untuk mencetak struk fisik.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Cetak Struk #${activeOrder.orderNumber}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace;
              width: 58mm;
              padding: 4mm;
              margin: 0;
              font-size: 10px;
              line-height: 1.2;
              color: #000;
              background: #fff;
            }
            .center { text-align: center; }
            .right { text-align: right; }
            .divider { border-top: 1px dashed #000; margin: 4px 0; }
            .bold { font-weight: bold; }
            .title { font-size: 12px; font-weight: bold; }
            table { width: 100%; border-collapse: collapse; }
            td { vertical-align: top; font-size: 10px; }
            .mb { margin-bottom: 8px; }
          </style>
        </head>
        <body onload="window.print();window.close()">
          ${printContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Render receipt parts for readability
  const orderDate = activeOrder ? new Date(activeOrder.createdAt).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) : '';

  return (
    <div className="space-y-3">
      {/* Bluetooth Connection Quick Bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-left">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            bleConnectionState === 'connected' ? 'bg-green-500 animate-pulse' :
            bleConnectionState === 'connecting' ? 'bg-amber-500 animate-spin border border-dashed border-amber-300' :
            'bg-gray-600'
          }`} />
          <div>
            <p className="text-[11px] font-black font-mono text-gray-300 uppercase tracking-wider">
              Status Thermal Printer: {
                bleConnectionState === 'connected' ? 'TERKONEKSI' :
                bleConnectionState === 'connecting' ? 'MENYAMBUNGKAN...' :
                bleConnectionState === 'error' ? 'ERROR KONEKSI' : 'BLUETOOTH DISCONNECTED'
              }
            </p>
            <p className="text-[9px] text-gray-500 font-bold mt-0.5">
              {bleConnectionState === 'connected' ? `Tersambung ke: ${bleDevice?.name || 'Printer ESC/POS'}` : 'Klik Hubungkan untuk menyambungkan printer thermal Bluetooth asli!'}
            </p>
            {bleConnectionState === 'error' && (
              <p className="text-[9px] text-red-400 font-bold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {bleErrorMessage}
              </p>
            )}
          </div>
        </div>

        <div>
          {bleConnectionState === 'connected' ? (
            <button
              onClick={handleDisconnectBluetooth}
              className="py-1 px-3 bg-red-900/40 hover:bg-red-900/60 border border-red-800 text-red-200 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-colors flex items-center gap-1.5"
            >
              <WifiOff className="w-3.5 h-3.5" /> Putuskan
            </button>
          ) : (
            <button
              onClick={handleConnectBluetooth}
              disabled={bleConnectionState === 'connecting'}
              className="py-1 px-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5"
            >
              <Wifi className="w-3.5 h-3.5" /> Hubungkan
            </button>
          )}
        </div>
      </div>

      {/* Main Emulator display container */}
      {!activeOrder ? (
        <div id="thermal_printer_idle" className="bg-[#1e1e2e] rounded-2xl p-6 border border-[#2e2e3e] shadow-xl flex flex-col items-center justify-center h-48 text-center text-gray-400">
          <Printer className="w-12 h-12 text-gray-600 mb-3 animate-pulse" />
          <p className="font-semibold text-gray-300">Emulator Bluetooth Printer</p>
          <p className="text-xs text-gray-500 mt-1 max-w-[200px]">Hubungkan thermal printer Anda atau simulasikan struk cetak otomatis di sini.</p>
          <div className="flex items-center gap-1.5 mt-3 bg-[#11111b] px-3 py-1 rounded-full border border-green-500/10 text-[10px] text-green-400 font-mono">
            <Wifi className="w-3 h-3 text-green-400 animate-pulse" /> BLE PRINTER DISCOVERY ACTIVE
          </div>
        </div>
      ) : (
        <div id="thermal_printer_active" className="bg-[#1e1e2e] rounded-2xl p-5 border border-[#2e2e3e] shadow-2xl relative flex flex-col justify-between overflow-hidden">
          
          {/* Header and status light */}
          <div className="flex items-center justify-between mb-4 border-b border-[#2e2e3e] pb-3">
            <div className="flex items-center gap-2">
              <Printer className="w-5 h-5 text-indigo-400" />
              <span className="font-semibold text-gray-200 text-sm">Bluetooth Printer (ESC/POS)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400 font-mono">
                {isPrinting ? 'PRINTING...' : 'ONLINE'}
              </span>
              <span className={`w-2.5 h-2.5 rounded-full ${isPrinting ? 'bg-orange-500 animate-ping' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`} />
            </div>
          </div>

          {/* Printer Mechanism Representation */}
          <div className="bg-[#11111b] rounded-xl p-3 border border-[#222235] relative mb-4">
            {/* Paper Feed Slot */}
            <div className="w-full h-2.5 bg-[#08080f] rounded-full border-t border-b border-[#2e2e3e] relative z-20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
              <div className="absolute left-1/2 -translate-x-1/2 top-1 w-2/3 h-0.5 bg-[#ff5e5e]/20" />
            </div>

            {/* Paper Spool Output Roll container */}
            <div className="overflow-hidden mt-[-4px] relative bg-[#11111b] flex justify-center z-10 select-none">
              <div 
                style={{ 
                  height: `${isTorn ? 0 : printHeight * 3.4}px`, 
                  opacity: isTorn ? 0 : 1,
                  transition: isTorn ? 'height 0.3s ease-out, opacity 0.2s' : 'none'
                }}
                className="w-[280px] bg-white text-gray-900 shadow-md font-mono text-[10px] leading-normal px-4 pt-3 pb-8 relative flex flex-col border-l border-r border-gray-300 transform origin-top shadow-[0_15px_30px_rgba(0,0,0,0.5)] transition-[height]"
              >
                {/* Tear lines/Jagged paper bottom effect */}
                <div className="absolute bottom-0 left-0 right-0 h-4 bg-white flex overflow-hidden">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div key={i} className="w-2.5 h-2.5 bg-[#11111b] shrink-0 rotate-45 transform translate-y-2 border-t border-l border-gray-300" />
                  ))}
                </div>

                {/* Receipt Content Simulator */}
                <div className="w-full text-center mb-1">
                  <p className="text-xs font-bold leading-tight">{settings.shopName}</p>
                  <p className="text-[8px] text-gray-500 leading-tight max-w-[200px] mx-auto">{settings.shopAddress}</p>
                  <p className="text-[8px] text-gray-500">WA: {settings.whatsappNumber}</p>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-1.5" />
                
                <div className="flex justify-between text-[9px] font-bold mb-1">
                  <span>ANTREAN: #{activeOrder.orderNumber}</span>
                  <span>{activeOrder.id}</span>
                </div>
                <div className="flex justify-between text-[8px] text-gray-600">
                  <span>{orderDate}</span>
                  <span>{activeOrder.isTakeaway ? 'TAKE AWAY' : `DINE IN: T-${activeOrder.tableNumber}`}</span>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-1.5" />
                
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-dashed border-gray-300 text-[8px] text-gray-500">
                      <th className="font-normal">Item</th>
                      <th className="font-normal text-right">Qty</th>
                      <th className="font-normal text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrder.items.map((item, idx) => {
                      const sCounts = item.pieceSauces.reduce((acc, s) => {
                        acc[s] = (acc[s] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const sauceLine = Object.entries(sCounts)
                        .map(([sauce, count]) => `${count}${sauce.charAt(0).toUpperCase()}`)
                        .join('/');

                      return (
                        <React.Fragment key={idx}>
                          <tr className="font-semibold text-[9px] pt-1">
                            <td>Dimsum {item.size === 'small' ? 'Sm (3p)' : 'Med (6p)'}</td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                          <tr>
                            <td colSpan={3} className="text-[8px] text-gray-500 pl-2 leading-tight">
                              Sauce: {sauceLine} 
                              {item.extraSauces.length > 0 && ` + Extra ${item.extraSauces.map(es => es.sauce.toUpperCase()).join('/')}`}
                              {item.notes && ` (${item.notes})`}
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-gray-400 my-1.5" />
                
                <div className="flex justify-between text-[8px] text-gray-600">
                  <span>Subtotal</span>
                  <span>{formatCurrency(activeOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[8px] text-gray-600">
                  <span>Service Charge</span>
                  <span>{formatCurrency(settings.serviceFee)}</span>
                </div>
                <div className="flex justify-between font-bold text-[9px] mt-0.5">
                  <span>Total Bayar</span>
                  <span>{formatCurrency(activeOrder.totalAmount)}</span>
                </div>
                
                <div className="border-t border-dashed border-gray-400 my-1.5" />
                
                <div className="flex justify-between text-[8px] font-semibold">
                  <span>Metode: {activeOrder.paymentMethod.toUpperCase()}</span>
                  <span>{activeOrder.paymentStatus === 'paid' ? 'LUNAS' : 'CASH KASIR'}</span>
                </div>

                <div className="border-t border-dashed border-gray-400 my-1.5" />
                
                <div className="text-center mt-1">
                  <p className="text-[8px] font-bold">TERIMAKASIH BANYAK</p>
                  <p className="text-[7px] text-gray-500">Silakan berkunjung kembali!</p>
                  
                  {/* Fake QR mini barcode */}
                  <div className="w-12 h-12 mx-auto border border-gray-200 rounded p-0.5 bg-white mt-1.5 flex flex-wrap items-center justify-center">
                    <div className="grid grid-cols-6 gap-0.5 w-10 h-10">
                      {Array.from({ length: 36 }).map((_, i) => (
                        <div 
                          key={i} 
                          className={`w-full h-full ${
                            (i % 3 === 0 || i % 7 === 0 || (i > 10 && i < 20 && i % 2 === 0)) ? 'bg-black' : 'bg-transparent'
                          }`} 
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-[7px] text-gray-400 mt-1">Bluetooth Printing Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* Control Actions */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleTear}
                disabled={isPrinting || isTorn}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-xs font-semibold font-mono transition-all duration-200 ${
                  isTorn || isPrinting
                    ? 'border-[#2e2e3e] text-gray-600 cursor-not-allowed bg-transparent'
                    : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10 active:scale-95 bg-[#251f12]'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" /> Tear Paper
              </button>
              
              <button
                onClick={bleCharacteristic ? () => printToBluetooth(activeOrder) : handleBrowserPrint}
                disabled={isPrinting}
                className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-semibold font-mono transition-all duration-200 ${
                  isPrinting
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-50 active:scale-95 shadow-[0_4px_12px_rgba(79,70,229,0.3)]'
                }`}
              >
                <PrinterCheck className="w-3.5 h-3.5" /> {bleCharacteristic ? 'Print Bluetooth' : 'Print Browser'}
              </button>
            </div>

            <button
              onClick={onClear}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-300 transition-colors py-1.5 border border-dashed border-[#2e2e3e] hover:border-[#4e4e5e] rounded-lg"
            >
              Reset Emulator
            </button>
          </div>

          {/* HIDDEN PRINT-ONLY AREA FOR BROWSER PRINT TO REAL THERMAL PRINTER (58mm/80mm compatible) */}
          <div id="thermal-receipt-print-area" className="hidden">
            <div className="center">
              <div className="title">{settings.shopName}</div>
              <div style={{ fontSize: '8px' }}>{settings.shopAddress}</div>
              <div style={{ fontSize: '8px' }}>WA: {settings.whatsappNumber}</div>
            </div>
            <div className="divider"></div>
            <div className="bold" style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between' }}>
              <span>ANTREAN: #{activeOrder.orderNumber}</span>
              <span>{activeOrder.id}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tanggal: {orderDate}</span>
              <span>Layanan: {activeOrder.isTakeaway ? 'TAKE AWAY' : 'MEJA ' + (activeOrder.tableNumber || '-')}</span>
            </div>
            <div className="divider"></div>
            <table>
              <thead>
                <tr className="bold">
                  <td>Menu</td>
                  <td className="right">Qty</td>
                  <td className="right">Harga</td>
                </tr>
              </thead>
              <tbody>
                {activeOrder.items.map((item, idx) => {
                  const sCounts = item.pieceSauces.reduce((acc, s) => {
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  const sauceLine = Object.entries(sCounts)
                    .map(([sauce, count]) => `${count}${sauce.charAt(0).toUpperCase()}`)
                    .join('/');

                  return (
                    <React.Fragment key={idx}>
                      <tr className="bold" style={{ borderTop: '1px dashed #eee' }}>
                        <td>Dimsum {item.size === 'small' ? 'Sm (3p)' : 'Med (6p)'}</td>
                        <td className="right">{item.quantity}</td>
                        <td className="right">{formatCurrency(item.totalPrice)}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} style={{ fontSize: '8px', color: '#555', paddingLeft: '2mm' }}>
                          Saus: {sauceLine} 
                          {item.extraSauces.length > 0 ? ' + Extra ' + item.extraSauces.map(es => es.sauce.toUpperCase()).join('/') : ''}
                          {item.notes ? ' (' + item.notes + ')' : ''}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
            <div className="divider"></div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Subtotal:</span>
              <span className="right">{formatCurrency(activeOrder.subtotal)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Biaya Layanan:</span>
              <span className="right">{formatCurrency(settings.serviceFee)}</span>
            </div>
            <div className="bold" style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
              <span>TOTAL BAYAR:</span>
              <span className="right">{formatCurrency(activeOrder.totalAmount)}</span>
            </div>
            <div className="divider"></div>
            <div className="bold" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Metode: {activeOrder.paymentMethod.toUpperCase()}</span>
              <span>{activeOrder.paymentStatus === 'paid' ? 'LUNAS' : 'CASH'}</span>
            </div>
            <div className="divider" style={{ marginTop: '8px' }}></div>
            <div className="center mb" style={{ fontSize: '8px', marginTop: '6px' }}>
              <strong>TERIMAKASIH BANYAK</strong><br/>
              Silakan berkunjung kembali!<br/>
              * Aplikasi Dimsum Kiosk & POS *
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
