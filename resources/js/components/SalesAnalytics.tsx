/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Order, SauceType } from '../types';
import { formatCurrency, SAUCE_INFO } from '../utils/mockData';
import { TrendingUp, ShoppingBag, DollarSign, Award, Percent, Utensils } from 'lucide-react';

interface SalesAnalyticsProps {
  orders: Order[];
}

export default function SalesAnalytics({ orders }: SalesAnalyticsProps) {
  // Filters to paid or completed orders to show actual real revenue
  const validOrders = orders.filter(o => o.paymentStatus === 'paid');
  
  // Calculate key metrics
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalItemsSold = validOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);
  const totalPiecesSold = validOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, item) => itemSum + (item.pcs * item.quantity), 0);
  }, 0);

  // Sauce popularity breakdown
  const sauceCounts: Record<SauceType, number> = { original: 0, mentai: 0, cheese: 0, tartar: 0 };
  let totalSauceInstances = 0;

  validOrders.forEach(o => {
    o.items.forEach(item => {
      item.pieceSauces.forEach(sauce => {
        if (sauceCounts[sauce] !== undefined) {
          sauceCounts[sauce] += item.quantity;
          totalSauceInstances += item.quantity;
        }
      });
      // Extra sauces count too
      item.extraSauces.forEach(es => {
        if (sauceCounts[es.sauce] !== undefined) {
          sauceCounts[es.sauce] += es.quantity;
          totalSauceInstances += es.quantity;
        }
      });
    });
  });

  // Size popularity
  let smallCount = 0;
  let mediumCount = 0;
  validOrders.forEach(o => {
    o.items.forEach(item => {
      if (item.size === 'small') smallCount += item.quantity;
      if (item.size === 'medium') mediumCount += item.quantity;
    });
  });

  // Payment method ratio
  let qrisRevenue = 0;
  let cashRevenue = 0;
  validOrders.forEach(o => {
    if (o.paymentMethod === 'qris') qrisRevenue += o.totalAmount;
    if (o.paymentMethod === 'cash') cashRevenue += o.totalAmount;
  });

  // Top Sauce calculation
  const topSauceEntry = Object.entries(sauceCounts).reduce((a, b) => (a[1] > b[1] ? a : b), ['mentai', 0]);
  const topSauceName = SAUCE_INFO[topSauceEntry[0] as SauceType]?.name.split(' ')[1] || 'Mentai';

  // SVG Chart Computations
  // 1. Sauce Doughnut (Pie) Calculation
  const originalPct = totalSauceInstances ? (sauceCounts.original / totalSauceInstances) * 100 : 0;
  const mentaiPct = totalSauceInstances ? (sauceCounts.mentai / totalSauceInstances) * 100 : 0;
  const cheesePct = totalSauceInstances ? (sauceCounts.cheese / totalSauceInstances) * 100 : 0;
  const tartarPct = totalSauceInstances ? (sauceCounts.tartar / totalSauceInstances) * 100 : 0;

  // Let's create helper parameters for a clean polar doughnut svg
  const r = 50;
  const circumference = 2 * Math.PI * r;
  const originalDash = (originalPct / 100) * circumference;
  const mentaiDash = (mentaiPct / 100) * circumference;
  const cheeseDash = (cheesePct / 100) * circumference;
  const tartarDash = (tartarPct / 100) * circumference;

  const originalOffset = circumference;
  const mentaiOffset = circumference - originalDash;
  const cheeseOffset = circumference - originalDash - mentaiDash;
  const tartarOffset = circumference - originalDash - mentaiDash - cheeseDash;

  // 2. Size Popularity Ratio Bar (custom percentage bar)
  const totalSizes = smallCount + mediumCount;
  const smallPct = totalSizes ? (smallCount / totalSizes) * 100 : 50;
  const mediumPct = totalSizes ? (mediumCount / totalSizes) * 100 : 50;

  return (
    <div id="sales_analytics_section" className="space-y-6">
      
      {/* Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Total Revenue */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold">Total Pendapatan</span>
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shadow-2xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 font-mono tracking-tight">{formatCurrency(totalRevenue)}</h3>
            <p className="text-[10px] text-green-600 flex items-center gap-1 mt-1 font-bold">
              <TrendingUp className="w-3 h-3" /> +12.4% vs Kemarin
            </p>
          </div>
        </div>

        {/* Orders Count */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold">Total Pesanan</span>
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-600 border border-red-100 shadow-2xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 font-mono tracking-tight">{validOrders.length} Order</h3>
            <p className="text-[10px] text-gray-400 mt-1 font-bold">Dari {orders.length} total pengajuan</p>
          </div>
        </div>

        {/* Pieces Sold */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold">Dimsum Terjual</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-100 shadow-2xs">
              <Utensils className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900 font-mono tracking-tight">{totalPiecesSold} Pcs</h3>
            <p className="text-[10px] text-amber-600 mt-1 font-bold">Rata-rata {totalItemsSold ? (totalPiecesSold / totalItemsSold).toFixed(1) : 0} pcs/item</p>
          </div>
        </div>

        {/* Favorite Sauce */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500 mb-2">
            <span className="text-xs font-bold">Saus Terlaris</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shadow-2xs">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-900">{topSauceName}</h3>
            <p className="text-[10px] text-gray-400 mt-1 font-bold">Terpilih {topSauceEntry[1]} kali hari ini</p>
          </div>
        </div>

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Doughnut Chart: Sauce Distribution */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs">
          <h4 className="text-sm font-extrabold text-gray-900 mb-4 flex items-center gap-1.5 uppercase tracking-wider">
            <Percent className="w-4 h-4 text-red-600" /> Distribusi Pilihan Saus
          </h4>
          
          <div className="flex flex-col sm:flex-row items-center justify-around gap-6 py-2">
            
            {/* Custom SVG Circular Doughnut */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Ring */}
                <circle cx="60" cy="60" r={r} fill="transparent" stroke="#f3f4f6" strokeWidth="12" />
                
                {/* Original segment */}
                <circle 
                  cx="60" cy="60" r={r} fill="transparent" 
                  stroke={SAUCE_INFO.original.color} strokeWidth="14" 
                  strokeDasharray={`${originalDash} ${circumference}`} 
                  strokeDashoffset={originalOffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />

                {/* Mentai segment */}
                <circle 
                  cx="60" cy="60" r={r} fill="transparent" 
                  stroke={SAUCE_INFO.mentai.color} strokeWidth="14" 
                  strokeDasharray={`${mentaiDash} ${circumference}`} 
                  strokeDashoffset={mentaiOffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />
                
                {/* Cheese segment */}
                <circle 
                  cx="60" cy="60" r={r} fill="transparent" 
                  stroke={SAUCE_INFO.cheese.color} strokeWidth="14" 
                  strokeDasharray={`${cheeseDash} ${circumference}`} 
                  strokeDashoffset={cheeseOffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />
                
                {/* Tartar segment */}
                <circle 
                  cx="60" cy="60" r={r} fill="transparent" 
                  stroke={SAUCE_INFO.tartar.color} strokeWidth="14" 
                  strokeDasharray={`${tartarDash} ${circumference}`} 
                  strokeDashoffset={tartarOffset} 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                />
              </svg>

              <div className="absolute text-center">
                <span className="text-[9px] text-gray-400 uppercase font-mono font-extrabold block">Total Saus</span>
                <span className="text-lg font-black text-gray-900 font-mono">{totalSauceInstances}</span>
              </div>
            </div>

            {/* Legends */}
            <div className="space-y-3 shrink-0 w-full sm:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-500" />
                  <span className="text-xs text-gray-800 font-extrabold">{SAUCE_INFO.original.name.split(' ')[1]}</span>
                </div>
                <span className="text-xs font-bold text-gray-500 font-mono sm:ml-auto">{originalPct.toFixed(0)}% ({sauceCounts.original})</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ff6b35]" />
                  <span className="text-xs text-gray-800 font-extrabold">{SAUCE_INFO.mentai.name.split(' ')[1]}</span>
                </div>
                <span className="text-xs font-bold text-gray-500 font-mono sm:ml-auto">{mentaiPct.toFixed(0)}% ({sauceCounts.mentai})</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ffb703]" />
                  <span className="text-xs text-gray-800 font-extrabold">{SAUCE_INFO.cheese.name.split(' ')[1]}</span>
                </div>
                <span className="text-xs font-bold text-gray-500 font-mono sm:ml-auto">{cheesePct.toFixed(0)}% ({sauceCounts.cheese})</span>
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#028090]" />
                  <span className="text-xs text-gray-800 font-extrabold">{SAUCE_INFO.tartar.name.split(' ')[1]}</span>
                </div>
                <span className="text-xs font-bold text-gray-500 font-mono sm:ml-auto">{tartarPct.toFixed(0)}% ({sauceCounts.tartar})</span>
              </div>
            </div>

          </div>
        </div>

        {/* Horizontal Stack: Size & Payment Methods */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          
          {/* Size Popularity Bar */}
          <div>
            <h4 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <Utensils className="w-4 h-4 text-red-600" /> Perbandingan Porsi Dimsum
            </h4>
            
            <div className="space-y-2 py-1">
              <div className="flex justify-between text-xs text-gray-500 font-bold">
                <span>Small (3 Pcs) - {smallCount} porsi</span>
                <span>Medium (6 Pcs) - {mediumCount} porsi</span>
              </div>
              
              {/* Stacked custom track */}
              <div className="w-full h-5 bg-gray-100 rounded-full overflow-hidden flex p-0.5 border border-gray-200">
                <div 
                  style={{ width: `${smallPct}%` }}
                  className="h-full bg-red-500 rounded-l-full flex items-center justify-center text-[10px] text-white font-black font-mono transition-all duration-1000"
                >
                  {smallPct > 15 ? `${smallPct.toFixed(0)}%` : ''}
                </div>
                <div 
                  style={{ width: `${mediumPct}%` }}
                  className="h-full bg-red-600 rounded-r-full flex items-center justify-center text-[10px] text-white font-black font-mono transition-all duration-1000"
                >
                  {mediumPct > 15 ? `${mediumPct.toFixed(0)}%` : ''}
                </div>
              </div>
              <div className="flex justify-between text-[10px] text-gray-400 font-bold pt-1">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" /> Small (3 Pcs)</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-600" /> Medium (6 Pcs)</span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 my-4" />

          {/* Payment Method Distribution */}
          <div>
            <h4 className="text-sm font-extrabold text-gray-900 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
              <DollarSign className="w-4 h-4 text-red-600" /> Distribusi Metode Pembayaran
            </h4>
            
            <div className="grid grid-cols-2 gap-4">
              
              {/* QRIS Revenue Info */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-green-700 font-black bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">QRIS</span>
                  <span className="text-[10px] text-gray-500 font-mono font-bold">
                    {totalRevenue ? ((qrisRevenue / totalRevenue) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-bold">Total Transaksi</p>
                <p className="text-sm font-black text-gray-900 font-mono mt-0.5">{formatCurrency(qrisRevenue)}</p>
              </div>

              {/* Cash Revenue Info */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-red-700 font-black bg-red-50 border border-red-100 px-1.5 py-0.5 rounded-full uppercase tracking-wider">Cash</span>
                  <span className="text-[10px] text-gray-500 font-mono font-bold">
                    {totalRevenue ? ((cashRevenue / totalRevenue) * 100).toFixed(0) : 0}%
                  </span>
                </div>
                <p className="text-xs text-gray-400 font-bold">Bayar di Kasir</p>
                <p className="text-sm font-black text-gray-900 font-mono mt-0.5">{formatCurrency(cashRevenue)}</p>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
