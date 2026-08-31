import { Injectable, signal, Signal } from '@angular/core';
import { UnitRepository } from './unit.repository';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';

@Injectable({ providedIn: 'root' })
export class SupabaseUnitRepository implements UnitRepository {
  private readonly _units = signal<GenericInventoryItem[]>([
    { id: '1', name: 'Unidad Comercial', code: 'UN-UND', metricCount: 850, isActive: true },
    { id: '2', name: 'Kilogramo Métrico', code: 'UN-KG', metricCount: 320, isActive: true },
    { id: '3', name: 'Litro Volumétrico', code: 'UN-LT', metricCount: 45, isActive: true }
  ]);

  getUnits(): Signal<GenericInventoryItem[]> { return this._units.asReadonly(); }
  addUnit(item: GenericInventoryItem): void { this._units.update(curr => [item, ...curr]); }
  updateUnit(item: GenericInventoryItem): void {
    this._units.update(curr => curr.map(u => u.id === item.id ? item : u));
  }
}
