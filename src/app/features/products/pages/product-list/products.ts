import { Component, signal, computed, inject } from '@angular/core';
import { RouterModule, Router } from '@angular/router'; // <-- Agregada la importación de Router
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository'; // <-- Reconexión arquitectónica

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './products.html'
})
export class Products {
  // Inyecciones funcionales nativas de Angular v22
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly router = inject(Router); // <-- Inyectado con éxito para solucionar la navegación

  // Estados reactivos de control para los filtros de búsqueda de la UI
  readonly searchQuery = signal<string>('');
  readonly selectedStatus = signal<string>('Todos');
  private readonly selectProduct = signal<string>('');

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
    // Viaja de forma elástica a la ruta dual pasando el ID técnico del producto
    this.router.navigate(['/products/edit', id]); 
  }
}
