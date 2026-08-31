import { Component, signal, computed, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router'; 
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository'; 
import { SettingsService } from '../../../../core/services/settings.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './products.html'
})
export class Products {
  // Inyecciones funcionales nativas de Angular v22
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly router = inject(Router); 
  private readonly settingsService = inject(SettingsService);
  // Estados reactivos de control para los filtros de búsqueda de la UI
  readonly searchQuery = signal<string>('');
  readonly selectedStatus = signal<string>('Todos');
  private readonly selectProduct = signal<string>('');
  readonly currentViewMode = this.settingsService.productViewMode;
  // Consumo directo de la señal reactiva y persistente del repositorio global
  readonly products = this.productService.getProducts();

  // Señal derivada (Computed): Filtra en tiempo real combinando texto y estado de forma óptima
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const statusFilter = this.selectedStatus();
    
    return this.products().filter(prod => {
      const matchesSearch = prod.name.toLowerCase().includes(query) || prod.sku.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'Todos' || prod.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

  /**
   * Convierte un valor numérico o string de número puro a un formato visual limpio con puntos de miles.
   * Requerido por la celda del precio base (buyPrice) en el archivo HTML.
   */
  formatVisual(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    // Sanitiza el valor removiendo cualquier carácter no numérico por seguridad
    const cleanValue = value.toString().replace(/\D/g, '');
    if (!cleanValue) return '';
    return new Intl.NumberFormat('es-CO').format(parseInt(cleanValue, 10));
  }

  // Métodos reactivos para actualizar el estado de los filtros desde la vista
  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  updateStatus(status: string): void {
    this.selectedStatus.set(status);
  }

  // Método interactivo al presionar sobre la fila de la tabla
  productUpdate(id: string): void {
    this.router.navigate(['/products/edit', id]); 
  }
}
