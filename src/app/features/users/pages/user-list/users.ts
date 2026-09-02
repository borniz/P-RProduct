import { Component, inject } from '@angular/core';
import { GenericListComponent } from '../../../inventory/shared/pages/generic-list/generic-list';
import { ModuleMetadata, GenericInventoryItem } from '../../../inventory/shared/models/generic-inventory.model';
import { USER_REPOSITORY } from '../../data-access/user.repository';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [GenericListComponent],
  template: `
    <app-generic-list [metadata]="userMetadata" 
                      [items]="users()" 
                      (itemAdded)="onAdd($event)" 
                      (itemUpdated)="onUpdate($event)">
    </app-generic-list>
  `
})
export class UserListComponent {
  private readonly userRepo = inject(USER_REPOSITORY);
  readonly users = this.userRepo.getUsers();

  // Configuración semántica para el perfil de Operadores
  readonly userMetadata: ModuleMetadata = {
    entityName: 'Usuario',
    pluralName: 'Control de Usuarios y Roles',
    subtitle: 'Gestión de personal de caja, bodegueros y administradores de B&R Solutions',
    metricLabel: 'Transacciones Firmadas',
    hasDescription: true,
    descriptionPlaceholder: 'Especifica el rol estricto (Ej: Administrador, Cajero Turno Tarde, Bodeguero Central)...'
  };

  onAdd(item: GenericInventoryItem): void { this.userRepo.addUser(item); }
  onUpdate(item: GenericInventoryItem): void { this.userRepo.updateUser(item); }
}
