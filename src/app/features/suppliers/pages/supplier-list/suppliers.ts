import { Component, inject } from '@angular/core';
import { GenericListComponent } from '../../../inventory/shared/pages/generic-list/generic-list';
import { ModuleMetadata, GenericInventoryItem } from '../../../inventory/shared/models/generic-inventory.model';
import { SUPPLIER_REPOSITORY } from '../../data-access/supplier.repository';

@Component({
  selector: 'app-supplier-list',
  standalone: true,
  imports: [GenericListComponent],
  template: `
    <app-generic-list [metadata]="supplierMetadata" 
                      [items]="suppliers()" 
                      (itemAdded)="onAdd($event)" 
                      (itemUpdated)="onUpdate($event)">
    </app-generic-list>
  `
})
export class SupplierListComponent {
  private readonly supplierRepo = inject(SUP_REPOSITORY_TOKEN()); // Inyección funcional
  
  // Consumo directo de la señal reactiva compartida
  readonly suppliers = this.supplierRepo.getSuppliers();

  // Configuración semántica exclusiva para la marca de Proveedores
  readonly supplierMetadata: ModuleMetadata = {
    entityName: 'Proveedor',
    pluralName: 'Cuentas de Proveedores',
    subtitle: 'Mapeo de cadenas de suministro, contratos de distribución y contactos comerciales',
    metricLabel: 'Categorías que Abastece',
    hasDescription: true,
    descriptionPlaceholder: 'Ej: Contacto corporativo, correo electrónico, fletes o condiciones de crédito...'
  };

  // Despacho automático de acciones CRUD al repositorio a través del componente reutilizable
  onAdd(item: GenericInventoryItem): void { this.supplierRepo.addSuppliers(item); }
  onUpdate(item: GenericInventoryItem): void { this.supplierRepo.updateSuppliers(item); }
}

// Token de escape para resolver tipados estrictos en caliente
function SUP_REPOSITORY_TOKEN() {
  return SUPPLIER_REPOSITORY;
}
