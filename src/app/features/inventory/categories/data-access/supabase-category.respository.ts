import { Injectable } from '@angular/core';
import { CategoryRepository } from './category.repository';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';
import { Signal } from '@angular/core';
import { GenericSupabaseRepository } from '../../shared/data-access/generic-supabase.respository';

@Injectable({ providedIn: 'root' })
export class SupabaseCategoryRepository extends GenericSupabaseRepository implements CategoryRepository {
  constructor() {
    super('categories'); // <-- Se conecta en vivo a la tabla 'categories' de PostgreSQL
  }

  getCategories(): Signal<GenericInventoryItem[]> { return this.getItemsSignal(); }
  addCategory(item: GenericInventoryItem): void { this.addItem(item); }
  updateCategory(item: GenericInventoryItem): void { this.updateItem(item); }
}
