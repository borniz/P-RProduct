import { InjectionToken, Signal } from '@angular/core';
import { GenericInventoryItem } from '../../inventory/shared/models/generic-inventory.model';

export interface UserRepository {
  getUsers(): Signal<GenericInventoryItem[]>;
  addUser(user: GenericInventoryItem): void;
  updateUser(user: GenericInventoryItem): void;
}

export const USER_REPOSITORY = new InjectionToken<UserRepository>('UserRepository');
