import { InjectionToken, Signal } from '@angular/core';
import { StockMovement } from '../models/stock.model';

// Objeto de transferencia de datos exacto que inyectamos en tu panel SQL de Supabase
export interface StockMovementDto {
  id: string;
  product_name: string;
  type: 'Ingreso' | 'Egreso' | 'Ajuste';
  quantity: number;
  reason: string;
  operator: string;
  created_at?: string;
}

export interface StockRepository {
  getMovements(): Signal<StockMovement[]>;
  registerMovement(movement: StockMovement): Promise<void>; // Cambiado a Promise para red asíncrona
}

export const STOCK_REPOSITORY = new InjectionToken<StockRepository>('StockRepository');
