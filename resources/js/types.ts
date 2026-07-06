/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SauceType = 'original' | 'mentai' | 'cheese' | 'tartar';

export type DimsumSize = 'small' | 'medium';

export type OrderStatus = 'pending_payment' | 'received' | 'cooking' | 'ready' | 'completed' | 'cancelled';

export type PaymentMethod = 'cash' | 'qris';

export type PaymentStatus = 'unpaid' | 'paid';

export interface SauceConfig {
  id: SauceType;
  name: string;
  price: number;
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  available: boolean;
}

export interface SizeConfig {
  id: DimsumSize;
  name: string;
  pcs: number;
  basePrice: number;
  description: string;
}

export interface CartItem {
  id: string;
  size: DimsumSize;
  pcs: number;
  // sauce for each piece, e.g. for small (3 pcs): ['mentai', 'cheese', 'mentai']
  pieceSauces: SauceType[];
  extraSauces: {
    sauce: SauceType;
    quantity: number;
    price: number;
  }[];
  notes: string;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
}

export interface Order {
  id: string; // e.g. "DS-1001"
  orderNumber: string; // e.g. "001"
  customerName: string;
  customerPhone: string;
  isTakeaway: boolean;
  tableNumber?: string;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number; // e.g. Rp 2.000
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string; // ISO string
  notes?: string;
}

export interface MerchantSettings {
  shopName: string;
  shopAddress: string;
  whatsappNumber: string; // e.g. "628123456789"
  taxRate: number; // e.g. 0.10 (10%)
  serviceFee: number; // e.g. 2000
  currencySymbol: string; // e.g. "Rp"
  autoPrintReceipt: boolean;
  soundAlertEnabled: boolean;
  
  // Laravel API Integration
  laravelApiEnabled: boolean;
  laravelApiUrl: string; // e.g. "http://localhost:8000"
  laravelApiToken: string;

  // WhatsApp Gateway Integration
  whatsappMode: 'direct' | 'fonnte' | 'laravel';
  whatsappGatewayUrl: string; // e.g. "https://api.fonnte.com/send"
  whatsappGatewayToken: string;
}
