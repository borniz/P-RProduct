import { Product } from '../../products/models/product.model';

export interface PurchaseItem {
  product: Product;
  quantity: number;
  costPrice: number; // Costo pactado de compra con el distribuidor
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  status: 'Solicitado' | 'Recibido';
  createdAt: string;
  operator: string;
}
