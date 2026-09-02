import { Injectable, inject, signal, computed, Signal } from '@angular/core';
import { USER_REPOSITORY } from '../../features/users/data-access/user.repository';
import { GenericInventoryItem } from '../../features/inventory/shared/models/generic-inventory.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly userRepo = inject(USER_REPOSITORY);
  
  // Consumo directo de la lista viva de usuarios de Supabase
  readonly availableUsers = this.userRepo.getUsers();

  // 📌 SIGNAL CORE DE SESIÓN ACTIVE: Almacena el usuario que está operando el ERP
  private readonly _currentUser = signal<GenericInventoryItem>({
    id: 'MAESTRO',
    code: 'RUT-MAESTRO',
    name: 'yarod Bonilla',
    description: 'Administrador',
    isActive: true
  });

  // Exposición de solo lectura segura de la sesión
  readonly currentUser = this._currentUser.asReadonly();

  // Atajo reactivo para jalar directamente el nombre del operador activo
  readonly currentOperatorName = computed(() => this._currentUser().name);

  // Atajo reactivo para jalar el rol o descripción del operario
  readonly currentOperatorRole = computed(() => this._currentUser().description || 'Operador');

  // Método mutador para cambiar de usuario/cajero sobre la marcha
  switchUser(user: GenericInventoryItem): void {
    if (user && user.isActive) {
      this._currentUser.set(user);
    }
  }
}
