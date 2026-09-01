import { Injectable } from '@angular/core';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';
import { Signal } from '@angular/core';
import { GenericSupabaseRepository } from '../../shared/data-access/generic-supabase.respository';
import { BrandRepository } from './brands.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseBrandRepository extends GenericSupabaseRepository implements BrandRepository {
  constructor() {
    super('brands'); // <-- Se conecta en vivo a la tabla 'brands' de PostgreSQL
  }

  getBrands(): Signal<GenericInventoryItem[]> { return this.getItemsSignal(); }
  addBrand(item: GenericInventoryItem): void { this.addItem(item); }
  updateBrand(item: GenericInventoryItem): void { this.updateItem(item); }
}
