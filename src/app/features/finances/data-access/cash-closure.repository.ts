import { InjectionToken, Signal } from '@angular/core';

export interface CashClosure {
  id: string;
  closureDate: string;
  salesCount: number;
  expectedCash: number;
  expectedCards: number;
  expectedTransfers: number;
  totalExpected: number;
  realCash: number;
  diffAmount: number;
  status: 'Cuadrado' | 'Faltante' | 'Sobrante';
  operator: string;
  // 🚀 LIMPIO: Removida la propiedad array de aquí porque el histórico no almacena este campo plano
}

export interface CashClosureRepository {
  getClosures(): Signal<CashClosure[]>;
  
  // 📌 SOLUCIÓN TÉCNICA: Se añade el segundo parámetro formal exigido por la base de datos relacional
  saveClosure(closure: Omit<CashClosure, 'id'>, todaySalesIds: string[]): Promise<void>;
}

export const CASH_CLOSURE_REPOSITORY = new InjectionToken<CashClosureRepository>('CashClosureRepository');
