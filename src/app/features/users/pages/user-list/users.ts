import { Component, inject, signal, OnInit } from '@angular/core'; // 📌 Importado OnInit
import { GenericListComponent } from '../../../inventory/shared/pages/generic-list/generic-list';
import { ModuleMetadata, GenericInventoryItem } from '../../../inventory/shared/models/generic-inventory.model';
import { USER_REPOSITORY } from '../../data-access/user.repository';
import { LoadingService } from '../../../../core/services/loading.service'; // 📌 SERVICIO GLOBAL INYECTADO

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
export class UserListComponent implements OnInit { // 📌 Implementada la interfaz OnInit
  private readonly userRepo = inject(USER_REPOSITORY);
  private readonly loadingService = inject(LoadingService); // 📌 Inyección funcional de carga

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

  // 🚀 REFRESCAR AL ABRIR LA VISTA (Carga asíncrona optimizada)
  ngOnInit(): void {
    this.syncUsersFromSupabase();
  }

  // 🔄 RECARGA DE RED: Despliega la barra de progreso elástica mientras refresca el personal del ERP
  async syncUsersFromSupabase(): Promise<void> {
    console.log('🔄 Sincronizando personal y llaves de acceso desde Supabase...');
    this.loadingService.show('Sincronizando operadores y roles con el servidor central...');

    try {
      // Evaluamos de manera segura qué método de actualización tiene programado tu repositorio de usuarios
      if (this.userRepo && 'load' in this.userRepo) {
        await (this.userRepo as any).load();
      } else if (this.userRepo && 'loadUsers' in this.userRepo) {
        await (this.userRepo as any).loadUsers();
      } else if (this.userRepo && 'refreshUsers' in this.userRepo) {
        await (this.userRepo as any).refreshUsers();
      }
      
      // 🏁 Finaliza la lectura completando la barra al 100% al vuelo
      this.loadingService.hide();
    } catch (error) {
      console.error('Error al descargar operadores de internet:', error);
      this.loadingService.hide();
    }
  }

  // 🚀 ACCIÓN ADICIONAR: Bloquea el canvas con la barra al registrar un operario nuevo
  async onAdd(item: GenericInventoryItem): Promise<void> { 
    this.loadingService.show(`Registrando al operador "${item.name}" en la base de datos...`);
    try {
      await this.userRepo.addUser(item);
      await this.syncUsersFromSupabase(); // Refresco inmediato en caliente para redibujar la grilla
    } catch (e) {
      this.loadingService.hide();
    }
  }

  // 🚀 ACCIÓN ACTUALIZAR: Despliega el loading con porcentaje real al modificar un rol
  async onUpdate(item: GenericInventoryItem): Promise<void> { 
    this.loadingService.show(`Actualizando privilegios y credenciales de "${item.name}"...`);
    try {
      await this.userRepo.updateUser(item);
      await this.syncUsersFromSupabase(); // Sincronización inmutable
    } catch (e) {
      this.loadingService.hide();
    }
  }
}
