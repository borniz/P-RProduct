import { Product } from '../../products/models/product.model';

export interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

export interface SaleInvoice {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;       // IVA 19%
  total: number;
  paymentMethod: 'Efectivo' | 'Tarjetas' | 'Transferencia';
  createdAt: string;
  operator: string;
}
