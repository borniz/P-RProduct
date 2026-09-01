import { Injectable } from '@angular/core';
import { UnitRepository } from './unit.repository';
import {  GenericUnitItem } from '../../shared/models/generic-inventory.model';
import { Signal } from '@angular/core';
import { GenericSupabaseRepository } from '../../shared/data-access/generic-supabase.respository';

@Injectable({ providedIn: 'root' })
export class SupabaseUnitRepository extends GenericSupabaseRepository implements UnitRepository {
  constructor() {
    super('units'); // <-- Se conecta en vivo a la tabla 'units' de PostgreSQL
  }

  getUnits(): Signal<GenericUnitItem[]> { return this.getItemsSignal(); }
  addUnit(item: GenericUnitItem): void { this.addItem(item); }
  updateUnit(item: GenericUnitItem): void { this.updateItem(item); }
}
