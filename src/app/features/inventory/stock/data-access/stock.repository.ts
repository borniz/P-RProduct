import { InjectionToken, Signal } from '@angular/core';
import { StockMovement } from '../models/stock.model';

export interface StockRepository {
  getMovements(): Signal<StockMovement[]>;
  registerMovement(movement: StockMovement): void;
}

export const STOCK_REPOSITORY = new InjectionToken<StockRepository>('StockRepository');
