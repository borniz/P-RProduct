import { Injectable } from '@angular/core';
import { SupplierRepository } from './supplier.repository';
import { GenericInventoryItem } from '../../inventory/shared/models/generic-inventory.model';
import { Signal } from '@angular/core';
import { GenericSupabaseRepository } from '../../inventory/shared/data-access/generic-supabase.respository';

@Injectable({ providedIn: 'root' })
export class SupabaseSupplierRepository extends GenericSupabaseRepository implements SupplierRepository {
  constructor() {
    super('suppliers'); // <-- Se conecta en vivo a la tabla 'suppliers' de PostgreSQL
  }

  getSuppliers(): Signal<GenericInventoryItem[]> { return this.getItemsSignal(); }
  addSuppliers(item: GenericInventoryItem): void { this.addItem(item); }
  updateSuppliers(item: GenericInventoryItem): void { this.updateItem(item); }
}
