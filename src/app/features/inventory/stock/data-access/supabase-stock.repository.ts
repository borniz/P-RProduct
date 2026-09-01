import { Injectable, signal, Signal } from '@angular/core';
import { StockRepository } from './stock.repository';
import { StockMovement } from '../models/stock.model';

@Injectable({
  providedIn: 'root'
})
export class SupabaseStockRepository implements StockRepository {
  // Historial simulado del Kardex de B&R Solutions con marcas temporales reales
  private readonly _movements = signal<StockMovement[]>([
    { id: 'MOV-001', productName: 'Rotomartillo Industrial 800W', type: 'Ingreso', quantity: 20, reason: 'Compra facturada a proveedor', date: '2026-08-31 09:15', operator: 'Carlos Méndez' },
    { id: 'MOV-002', productName: 'Pernos de Anclaje 3/8" (x50)', type: 'Egreso', quantity: 5, reason: 'Despacho Venta POS Factura #1024', date: '2026-08-31 11:40', operator: 'Ana Martínez' },
    { id: 'MOV-003', productName: 'Llave Alavesa Ajustable 12"', type: 'Ajuste', quantity: -2, reason: 'Pérdida/Mermas detectada en auditoría', date: '2026-08-31 16:20', operator: 'Carlos Méndez' },
    { id: 'MOV-004', productName: 'Esmalte Sintético Gris 1 Galón', type: 'Ingreso', quantity: 10, reason: 'Reposición de stock central', date: '2026-09-01 08:10', operator: 'Juan Delgado' }
  ]);

  getMovements(): Signal<StockMovement[]> {
    return this._movements.asReadonly();
  }

  registerMovement(movement: StockMovement): void {
    // Inserta el nuevo movimiento al tope del historial (Kardex inverso por fecha)
    this._movements.update(current => [movement, ...current]);
  }
}
