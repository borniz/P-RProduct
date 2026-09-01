import { InjectionToken, Signal } from '@angular/core';
import { GenericInventoryItem, GenericUnitItem } from '../../shared/models/generic-inventory.model';

export interface UnitRepository {
  getUnits(): Signal<GenericUnitItem[]>;
  addUnit(unit: GenericUnitItem): void;
  updateUnit(unit: GenericUnitItem): void;
}
export const UNIT_REPOSITORY = new InjectionToken<UnitRepository>('UnitRepository');
