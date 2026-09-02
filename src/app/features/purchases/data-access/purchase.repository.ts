import { InjectionToken, Signal } from '@angular/core';
import { PurchaseOrder } from '../models/purchase.model';

export interface PurchaseRepository {
  getOrders(): Signal<PurchaseOrder[]>;
  createOrder(order: PurchaseOrder): Promise<void>;
  receiveOrder(orderId: string): Promise<void>; // Procesa el ingreso físico a bodega
}

export const PURCHASE_REPOSITORY = new InjectionToken<PurchaseRepository>('PurchaseRepository');
