import { Component, computed, inject, signal } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { STOCK_REPOSITORY } from '../../../inventory/stock/data-access/stock.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';

@Component({
  selector: 'app-advanced-stats',
  standalone: true,
  imports: [], // Control flow nativo de Angular v22
  templateUrl: './advanced-stats.html'
})
export class AdvancedStatsComponent {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);

  // Señales directas conectadas en tiempo real a la nube
  readonly products = this.productRepo.getProducts();
  readonly allMovements = this.stockRepo.getMovements();
  readonly allSales = this.posRepo.getSales();

  // 📅 SIGNALS DE CONTROL PARA FILTRADO TEMPORAL
  readonly dateFilterType = signal<string>('30d'); // Opciones: 'hoy', '7d', '30d', 'custom'
  readonly customStartDate = signal<string>('');
  readonly customEndDate = signal<string>('');

  // 📌 FILTRADO EN CALIENTE: Determina las fechas límite según la opción o inputs del usuario
  readonly dateRange = computed(() => {
    const type = this.dateFilterType();
    const now = new Date();
    let start = new Date();
    let end = new Date();

    if (type === 'hoy') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (type === '7d') {
      start.setDate(now.getDate() - 7);
    } else if (type === '30d') {
      start.setDate(now.getDate() - 30);
    } else if (type === 'custom' && this.customStartDate() && this.customEndDate()) {
      start = new Date(this.customStartDate() + 'T00:00:00');
      end = new Date(this.customEndDate() + 'T23:59:59');
    } else {
      // Por defecto muestra los últimos 30 días si la personalizada está incompleta
      start.setDate(now.getDate() - 30);
    }

    return { start, end };
  });

  // 🛒 BOLETAS FILTRADAS POR RANGO
  readonly filteredSales = computed(() => {
    const range = this.dateRange();
    return this.allSales().filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= range.start && saleDate <= range.end;
    });
  });

  // 📦 MOVIMIENTOS KARDEX FILTRADOS POR RANGO
  readonly filteredMovements = computed(() => {
    const range = this.dateRange();
    return this.allMovements().filter(m => {
      const movDate = new Date(m.date);
      return movDate >= range.start && movDate <= range.end;
    });
  });

  // 📊 INDICADOR 1: Ticket Promedio de Venta Dinámico
  readonly ticketPromedio = computed(() => {
    const salesList = this.filteredSales();
    if (salesList.length === 0) return 0;
    const totalRevenue = salesList.reduce((sum, s) => sum + s.total, 0);
    return Math.round(totalRevenue / salesList.length);
  });

  // 📊 INDICADOR 2: Balance de Mermas por Rango Temporal
  readonly totalMermasValue = computed(() => {
    return this.filteredMovements()
      .filter(m => m.type === 'Ajuste' && m.quantity < 0)
      .reduce((sum, m) => {
        const prod = this.products().find(p => p.name === m.productName);
        const cleanPrice = prod ? Number(prod.buyprice.replace(/[^0-9]/g, '')) || 0 : 0;
        return sum + (Math.abs(m.quantity) * cleanPrice);
      }, 0);
  });

  // 📊 INDICADOR 3: Porcentaje de Eficiencia de Operaciones Ajustado
  readonly operationalEfficiency = computed(() => {
    const totalMovs = this.filteredMovements().length;
    if (totalMovs === 0) return 100;
    const manualAdjustments = this.filteredMovements().filter(m => m.type === 'Ajuste').length;
    return Math.round(((totalMovs - manualAdjustments) / totalMovs) * 100);
  });

  // 📈 GRÁFICO DINÁMICO: Acumulación adaptada al rango temporal
  readonly monthlyRevenueData = computed(() => {
    const salesList = this.filteredSales();
    const monthsLabels = ['May', 'Jun', 'Jul', 'Ago', 'Sep'];
    const revenueValues = new Array(5).fill(0);

    salesList.forEach(sale => {
      const date = new Date(sale.createdAt);
      const month = date.getMonth(); // 4 = Mayo, 8 = Sep
      if (month >= 4 && month <= 8) {
        revenueValues[month - 4] += sale.total;
      }
    });

    return {
      labels: monthsLabels,
      datasets: { data: revenueValues }
    };
  });

  readonly maxMonthValue = computed(() => {
    const data = this.monthlyRevenueData().datasets.data;
    const max = Math.max(...data);
    return max > 0 ? max : 1;
  });

  // Interceptores de eventos
  onFilterTypeChange(type: string): void {
    this.dateFilterType.set(type);
  }

  onCustomDateInput(event: Event, type: 'start' | 'end'): void {
    const val = (event.target as HTMLInputElement).value;
    if (type === 'start') this.customStartDate.set(val);
    else this.customEndDate.set(val);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
