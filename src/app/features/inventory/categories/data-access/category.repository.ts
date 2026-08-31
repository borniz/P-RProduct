import { InjectionToken, Signal } from '@angular/core';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';

export interface CategoryRepository {
  getCategories(): Signal<GenericInventoryItem[]>;
  addCategory(category: GenericInventoryItem): void;
  updateCategory(category: GenericInventoryItem): void;
}
export const CATEGORY_REPOSITORY = new InjectionToken<CategoryRepository>('CategoryRepository');
