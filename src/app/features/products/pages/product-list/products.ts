import { Component, signal, computed } from '@angular/core';

interface Product {
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  status: 'Óptimo' | 'Bajo' | 'Crítico';
  price: string;
}

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [], // En Angular v22 el flujo de control se resuelve nativamente en la plantilla
  templateUrl: './products.html'
})
export class Products {
  // Estados reactivos de control para los filtros de búsqueda
  readonly searchQuery = signal<string>('');
  readonly selectedStatus = signal<string>('Todos');

  // Base de datos simulada del catálogo maestro de FERREMAS
  readonly products = signal<Product[]>([
    { sku: 'HER-TL750', name: 'Taladro Percutor 750W', category: 'Herramientas eléctricas', stock: 85, minStock: 15, status: 'Óptimo', price: '$ 89.900' },
    { sku: 'FIJ-TR100', name: 'Tornillo Para Madera 1" (x100)', category: 'Fijaciones', stock: 120, minStock: 50, status: 'Óptimo', price: '$ 2.450' },
    { sku: 'HER-LLM22', name: 'Juego de Llaves Mixtas', category: 'Herramientas manuales', stock: 22, minStock: 25, status: 'Bajo', price: '$ 34.900' },
    { sku: 'ACC-BR008', name: 'Broca Concreto 8mm', category: 'Accesorios', stock: 4, minStock: 20, status: 'Crítico', price: '$ 1.250' },
    { sku: 'HER-ES412', name: 'Esmeril Angular 4 1/2"', category: 'Herramientas eléctricas', stock: 40, minStock: 10, status: 'Óptimo', price: '$ 45.900' },
    { sku: 'SEG-GA002', name: 'Gafas de Seguridad Transparentes', category: 'Protección personal', stock: 15, minStock: 30, status: 'Bajo', price: '$ 5.900' },
    { sku: 'PIN-LT001', name: 'Pintura Látex Blanca 1 Galón', category: 'Pinturas', stock: 2, minStock: 8, status: 'Crítico', price: '$ 18.500' }
  ]);

  // Señal derivada (Computed): Filtra en tiempo real combinando texto y estado
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const statusFilter = this.selectedStatus();
    
    return this.products().filter(prod => {
      const matchesSearch = prod.name.toLowerCase().includes(query) || prod.sku.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'Todos' || prod.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

  // Métodos reactivos para actualizar el estado del filtro desde la vista
  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  updateStatus(status: string): void {
    this.selectedStatus.set(status);
  }
}
