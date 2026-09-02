import { Injectable } from '@angular/core';
import { UserRepository } from './user.repository';
import { GenericInventoryItem } from '../../inventory/shared/models/generic-inventory.model';
import { Signal } from '@angular/core';
import { GenericSupabaseRepository } from '../../inventory/shared/data-access/generic-supabase.respository';

@Injectable({ providedIn: 'root' })
export class SupabaseUserRepository extends GenericSupabaseRepository implements UserRepository {
  constructor() {
    super('app_users'); // 🚀 Conexión viva automática a la tabla 'app_users' de PostgreSQL
  }

  getUsers(): Signal<GenericInventoryItem[]> { return this.getItemsSignal(); }
  addUser(item: GenericInventoryItem): void { this.addItem(item); }
  updateUser(item: GenericInventoryItem): void { this.updateItem(item); }
}
