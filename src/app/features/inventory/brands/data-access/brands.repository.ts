import { InjectionToken, Signal } from '@angular/core';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';

export interface BrandRepository {
  getBrands(): Signal<GenericInventoryItem[]>;
  addBrand(brand: GenericInventoryItem): void;
  updateBrand(brand: GenericInventoryItem): void;
}
export const BRAND_REPOSITORY = new InjectionToken<BrandRepository>('BrandRepository');
