import { Component, inject } from '@angular/core';
import { GenericListComponent } from '../../../shared/pages/generic-list/generic-list';
import { ModuleMetadata, GenericInventoryItem } from '../../../shared/models/generic-inventory.model';
import { BRAND_REPOSITORY } from '../../data-access/brands.repository';

@Component({
  selector: 'app-brand-list',
  standalone: true,
  imports: [GenericListComponent],
  template: `
    <app-generic-list [metadata]="brandMetadata" [items]="brands()" (itemAdded)="onAdd($event)" (itemUpdated)="onUpdate($event)"></app-generic-list>
  `
})
export class BrandListComponent {
  private readonly brandRepo = inject(BRAND_REPOSITORY);
  readonly brands = this.brandRepo.getBrands();

  readonly brandMetadata: ModuleMetadata = {
    entityName: 'Marca',
    pluralName: 'Marcas Homologadas',
    subtitle: 'Control maestro de fabricantes y proveedores de marcas en B&R Solutions',
    metricLabel: 'Proveedores Activos',
    hasDescription: true,
    descriptionPlaceholder: 'Ej: Herramientas de procedencia alemana con certificación ISO...'
  };

  onAdd(item: GenericInventoryItem): void { this.brandRepo.addBrand(item); }
  onUpdate(item: GenericInventoryItem): void { this.brandRepo.updateBrand(item); }
}
