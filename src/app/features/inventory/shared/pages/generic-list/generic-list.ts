import { Component, input, signal, computed, output } from '@angular/core';
import { GenericInventoryItem, ModuleMetadata } from '../../models/generic-inventory.model';
import { GenericFormModalComponent } from '../../components/generic-form-modal/generic-form-modal';

@Component({
  selector: 'app-generic-list',
  standalone: true,
  imports: [GenericFormModalComponent],
  templateUrl: './generic-list.html'
})
export class GenericListComponent {
  // Inputs requeridos provistos por el módulo inicializador
  readonly metadata = input.required<ModuleMetadata>();
  readonly items = input.required<GenericInventoryItem[]>();

  // Outputs para notificar los cambios hacia la persistencia del backend
  readonly itemAdded = output<GenericInventoryItem>();
  readonly itemUpdated = output<GenericInventoryItem>();

  // Controladores de estado reactivo local
  readonly searchQuery = signal<string>('');
  readonly isModalOpen = signal<boolean>(false);
  readonly selectedItem = signal<GenericInventoryItem | null>(null);

  // Filtrado computado transversal reutilizable
  readonly filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    return this.items().filter(item => 
      item.name.toLowerCase().includes(query) || item.code.toLowerCase().includes(query)
    );
  });

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  openCreateModal(): void {
    this.selectedItem.set(null); // Reseteamos para Modo Creación
    this.isModalOpen.set(true);
  }

  openEditModal(item: GenericInventoryItem): void {

    this.selectedItem.set(item); // Seteamos el ítem para Modo Edición Dual
    this.isModalOpen.set(true);
  }

  onItemSaved(item: GenericInventoryItem): void {

    if (this.selectedItem()) {
      this.itemUpdated.emit(item); // Despacha actualización
    } else {
      this.itemAdded.emit(item);   // Despacha inserción
    }
    this.isModalOpen.set(false);
  }
}
