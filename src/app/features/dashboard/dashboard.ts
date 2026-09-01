import { Component, computed, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { STOCK_REPOSITORY } from '../inventory/stock/data-access/stock.repository';
import { PRODUCT_REPOSITORY } from '../products/data-access/product.repository';
import { POS_REPOSITORY } from '../pos/data-acces/pos.repository';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent {
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly stockService = inject(STOCK_REPOSITORY);
  private readonly posService = inject(POS_REPOSITORY);

  // Señales directas conectadas a internet (Supabase)
  readonly products = this.productService.getProducts();
  readonly movements = this.stockService.getMovements();
  readonly sales = this.posService.getSales(); // <-- Asegúrate de que tu POS repo exponga getSales()

  // Controladores de estado local para el nuevo modal de alertas
  readonly isAlertModalOpen = signal<boolean>(false);

  // 📊 INDICADORES BASE
  readonly totalProductsCount = computed(() => this.products().length);
  
  readonly totalInventoryValue = computed(() => {
    return this.products().reduce((total, prod) => {
      const cleanBuyPrice = Number(prod.buyprice.replace(/[^0-9]/g, '')) || 0;
      return total + (prod.stock * cleanBuyPrice);
    }, 0);
  });

  // Lista completa de existencias en peligro (Crítico o Bajo) para el modal flotante
  readonly allCriticalProducts = computed(() => {
    return this.products().filter(p => p.status === 'Crítico' || p.status === 'Bajo');
  });

  readonly criticalStockCount = computed(() => this.allCriticalProducts().length);
  readonly recentActivity = computed(() => this.movements().slice(0, 4));
  readonly tableAlertsList = computed(() => this.allCriticalProducts().slice(0, 3));

  // 📈 ANALÍTICA CRONOLÓGICA DE VENTAS EN VIVO (Métricas solicitadas)
  
  // 1. Ventas Semanales (Últimos 7 días corridos)
  readonly weeklySalesTotal = computed(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.sales()
      .filter(sale => new Date(sale.createdAt) >= sevenDaysAgo)
      .reduce((sum, sale) => sum + sale.total, 0);
  });

  // 2. Ventas Mensuales (Mes actual)
  readonly currentMonthSalesTotal = computed(() => {
    const now = new Date();
    return this.sales()
      .filter(sale => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      })
      .reduce((sum, sale) => sum + sale.total, 0);
  });

  // 3. Comparativa Porcentual con el Mes Pasado
  readonly monthComparison = computed(() => {
    const now = new Date();
    
    // Calcular ventas del mes anterior
    const prevMonthSales = this.sales()
      .filter(sale => {
        const saleDate = new Date(sale.createdAt);
        const targetMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        const targetYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        return saleDate.getMonth() === targetMonth && saleDate.getFullYear() === targetYear;
      })
      .reduce((sum, sale) => sum + sale.total, 0);

    const currentSales = this.currentMonthSalesTotal();

    if (prevMonthSales === 0) {
      return { percentage: 100, isUp: true, label: 'Sin histórico previo' };
    }

    // Algoritmo de diferencial de crecimiento financiero
    const difference = currentSales - prevMonthSales;
    const percentage = Math.round((difference / prevMonthSales) * 100);

    return {
      percentage: Math.abs(percentage),
      isUp: percentage >= 0,
      label: percentage >= 0 ? `más que el mes pasado` : `menos que el mes pasado`
    };
  });

  // Auxiliares de interfaz
  openAlertsModal(): void { if (this.criticalStockCount() > 0) this.isAlertModalOpen.set(true); }
  closeAlertsModal(): void { this.isAlertModalOpen.set(false); }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
