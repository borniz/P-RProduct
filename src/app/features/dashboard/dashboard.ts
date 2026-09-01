import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PRODUCT_REPOSITORY } from '../products/data-access/product.repository';
import { STOCK_REPOSITORY } from '../inventory/stock/data-access/stock.repository';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule], // Control Flow nativo
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  // Inyección funcional de la capa de datos en vivo de Supabase
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly stockService = inject(STOCK_REPOSITORY);

  // Lectura directa de las señales reactivas de la nube
  readonly products = this.productService.getProducts();
  readonly movements = this.stockService.getMovements();

  // 📊 MÉTRICA 1: Contador de productos totales en catálogo
  readonly totalProductsCount = computed(() => this.products().length);

  // 📊 MÉTRICA 2: Valorización total del inventario (Stock * Precio de compra)
  readonly totalInventoryValue = computed(() => {
    return this.products().reduce((total, prod) => {
      // Limpiamos los caracteres de moneda ($) y puntos para la operación matemática pura
      const cleanBuyPrice = Number(prod.buyPrice.replace(/[^0-9]/g, '')) || 0;
      return total + (prod.stock * cleanBuyPrice);
    }, 0);
  });

  // 📊 MÉTRICA 3: Contador de productos en alerta (Stock <= MinStock)
  readonly criticalStockCount = computed(() => {
    return this.products().filter(p => p.status === 'Crítico' || p.status === 'Bajo').length;
  });

  // 📊 MÉTRICA 4: Lista de los 4 movimientos más recientes del Kardex para el feed visual
  readonly recentActivity = computed(() => {
    return this.movements().slice(0, 4);
  });

  // 📊 MÉTRICA 5: Lista de productos en estado crítico para la tabla de alertas rápidas
  readonly alertsList = computed(() => {
    return this.products().filter(p => p.status === 'Crítico').slice(0, 3);
  });

  // --- MÉTODO GENÉRICO DE FORMATEO DE MONEDA MONO ---
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
