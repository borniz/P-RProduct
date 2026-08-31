import { Component, inject } from '@angular/core';
import { GenericListComponent } from '../../../shared/pages/generic-list/generic-list';
import { ModuleMetadata, GenericInventoryItem } from '../../../shared/models/generic-inventory.model';
import { CATEGORY_REPOSITORY } from '../../data-access/category.repository';

@Component({
  selector: 'app-category-list',
  standalone: true,
  imports: [GenericListComponent],
  template: `
    <app-generic-list [metadata]="categoryMetadata" [items]="categories()" (itemAdded)="onAdd($event)" (itemUpdated)="onUpdate($event)"></app-generic-list>
  `
})
export class CategoryListComponent {
  private readonly categoryRepo = inject(CATEGORY_REPOSITORY);
  readonly categories = this.categoryRepo.getCategories();

  readonly categoryMetadata: ModuleMetadata = {
    entityName: 'Categoría',
    pluralName: 'Categorías de Inventario',
    subtitle: 'Gestión y parametrización de agrupaciones comerciales de productos',
    metricLabel: 'Productos Vinculados',
    hasDescription: true,
    descriptionPlaceholder: 'Ej: Rotomartillos, sierras circulares y consumibles eléctricos...'
  };

  onAdd(item: GenericInventoryItem): void { this.categoryRepo.addCategory(item); }
  onUpdate(item: GenericInventoryItem): void { this.categoryRepo.updateCategory(item); }
}
