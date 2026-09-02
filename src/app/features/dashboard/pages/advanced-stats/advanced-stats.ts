import { Component, computed, inject } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { STOCK_REPOSITORY } from '../../../inventory/stock/data-access/stock.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';

@Component({
  selector: 'app-advanced-stats',
  standalone: true,
  imports: [], // Control flow nativo de Angular v22 (@for, @if)
  templateUrl: './advanced-stats.html'
})
export class AdvancedStatsComponent {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);

  // Señales vivas conectadas en tiempo real a la nube (Supabase)
  readonly products = this.productRepo.getProducts();
  readonly movements = this.stockRepo.getMovements();
  readonly sales = this.posRepo.getSales();

  // 📊 INDICADOR 1: Ticket Promedio de Venta
  readonly ticketPromedio = computed(() => {
    const totalSales = this.sales();
    if (totalSales.length === 0) return 0;
    const totalRevenue = totalSales.reduce((sum, s) => sum + s.total, 0);
    return Math.round(totalRevenue / totalSales.length);
  });

  // 📊 INDICADOR 2: Balance de Mermas por Auditoría (Pérdidas)
  readonly totalMermasValue = computed(() => {
    return this.movements()
      .filter(m => m.type === 'Ajuste' && m.quantity < 0)
      .reduce((sum, m) => {
        const prod = this.products().find(p => p.name === m.productName);
        // 📌 CORREGIDO: Cambiado 'buyprice' por 'buyPrice' para respetar el tipado estricto del dominio
        const cleanPrice = prod ? Number(prod.buyprice.replace(/[^0-9]/g, '')) || 0 : 0;
        return sum + (Math.abs(m.quantity) * cleanPrice);
      }, 0);
  });

  // 📊 INDICADOR 3: Porcentaje de Eficiencia de Despacho
  readonly operationalEfficiency = computed(() => {
    const totalMovs = this.movements().length;
    if (totalMovs === 0) return 100;
    const manualAdjustments = this.movements().filter(m => m.type === 'Ajuste').length;
    return Math.round(((totalMovs - manualAdjustments) / totalMovs) * 100);
  });

  // 📈 LOGÍSTICA HISTÓRICA: Agrupación de ingresos reales por mes cronológico
  readonly monthlyRevenueData = computed(() => {
    const salesList = this.sales();
    const monthsLabels = ['May', 'Jun', 'Jul', 'Ago', 'Sep'];
    
    // Genera [0, 0, 0, 0, 0] de forma explícita e inalterable por texto
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
      datasets: [{
        label: 'Ingresos Mensuales ($ COP)',
        data: revenueValues
      }]
    };
  });

  // 📌 NUEVA SEÑAL COMPUTADA: Ponderación matemática de escala para inflar las barras del HTML
  readonly maxMonthValue = computed(() => {
    const data = this.monthlyRevenueData().datasets[0].data;
    const max = Math.max(...data);
    return max > 0 ? max : 1; // Protege contra divisiones por cero en base de datos vacía
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
