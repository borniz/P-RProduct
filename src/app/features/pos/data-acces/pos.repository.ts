import { InjectionToken, Signal } from '@angular/core';
import { SaleInvoice } from '../models/pos.models';

export interface PosRepository {
  processSale(invoice: SaleInvoice): Promise<void>;
  getSales(): Signal<SaleInvoice[]>; // 📌 NUEVO MÉTODO DE LECTURA REACTIVA
sendInvoiceToEmail(email: string, invoice: SaleInvoice): Promise<void>;}

export const POS_REPOSITORY = new InjectionToken<PosRepository>('PosRepository');
