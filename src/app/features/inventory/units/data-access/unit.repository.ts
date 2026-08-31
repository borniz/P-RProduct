import { InjectionToken, Signal } from '@angular/core';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';

export interface UnitRepository {
  getUnits(): Signal<GenericInventoryItem[]>;
  addUnit(unit: GenericInventoryItem): void;
  updateUnit(unit: GenericInventoryItem): void;
}
export const UNIT_REPOSITORY = new InjectionToken<UnitRepository>('UnitRepository');
