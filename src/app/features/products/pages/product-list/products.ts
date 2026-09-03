import { Component, signal, computed, inject, OnInit } from '@angular/core'; // 📌 Importado OnInit
import { RouterModule, Router } from '@angular/router';
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { SettingsService } from '../../../../core/services/settings.service';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [RouterModule], // Control flow nativo en plantilla (@if, @for)
  templateUrl: './products.html',
})
export class Products implements OnInit {
  // 📌 Implementada la interfaz OnInit
  // Inyecciones funcionales nativas de Angular v22
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly loadingService = inject(LoadingService); // 📌 INYECTADO SERVICIO DE PORCENTAJE REAL
  private readonly router = inject(Router);
  private readonly settingsService = inject(SettingsService);

  // Estados reactivos de control para los filtros de búsqueda de la UI
  readonly searchQuery = signal<string>('');
  readonly selectedStatus = signal<string>('Todos');
  private readonly selectProduct = signal<string>('');
  readonly currentViewMode = this.settingsService.productViewMode;

  // Consumo directo de la señal reactiva y persistente del repositorio global
  readonly products = this.productService.getProducts();

  // 🚀 REFRESCAR AL ABRIR LA VISTA (Garantiza auditoría de stock fresca al ingresar)
  ngOnInit(): void {
    this.syncCatalogFromSupabase();
  }

  // 🔄 SINCRONIZACIÓN DE RED: Levanta el lienzo de carga y procesa la descarga asíncrona de materiales
  async syncCatalogFromSupabase(): Promise<void> {
    console.log('🔄 Sincronizando catálogo maestro de B&R Solutions desde Supabase...');

    // Desplegamos el overlay global computando el incremento lineal en caliente
    this.loadingService.show('Sincronizando catálogo maestro con la base de datos remota...');

    try {
      // Evaluamos y disparamos el cargador nativo del repositorio de productos
      if (this.productService && 'loadProductsFromSupabase' in this.productService) {
        await (this.productService as any).loadProductsFromSupabase();
      } else if (this.productService && 'load' in this.productService) {
        await (this.productService as any).load();
      } else if (this.productService && 'refreshProducts' in this.productService) {
        await (this.productService as any).refreshProducts();
      }

      // 🏁 FINALIZA LA LECTURA FLUIDA: Desmonta el modal completando la barra al 100% al vuelo
      this.loadingService.hide();
    } catch (error) {
      console.error('Error crítico al sincronizar existencias de productos:', error);
      this.loadingService.hide(); // Despacho de seguridad en caso de caída de internet
    }
  }
  // 🔍 FILTRADO EN TIEMPO REAL: Recalcula al vuelo búsquedas cruzadas por Nombre, SKU y Alertas de Stock
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const statusFilter = this.selectedStatus();

    return this.products().filter((prod) => {
      const matchesSearch =
        prod.name.toLowerCase().includes(query) || prod.sku.toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'Todos' || prod.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  });

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

  // Método interactivo al presionar sobre la fila de la tabla o tarjeta de la cuadrícula
  productUpdate(id: string): void {
    this.router.navigate(['/products/edit', id]);
  }
}
