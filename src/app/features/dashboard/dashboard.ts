import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { STOCK_REPOSITORY } from '../inventory/stock/data-access/stock.repository';
import { PRODUCT_REPOSITORY } from '../products/data-access/product.repository';
import { POS_REPOSITORY } from '../pos/data-acces/pos.repository';
import { CommonModule } from '@angular/common'; // 📌 Inyectado para soporte nativo de tuberías de fecha/hora en el HTML

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit {
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly stockService = inject(STOCK_REPOSITORY);
  private readonly posService = inject(POS_REPOSITORY);
  private readonly router = inject(Router);

  // Señales directas conectadas a internet (Supabase)
  readonly products = this.productService.getProducts();
  readonly movements = this.stockService.getMovements();
  readonly sales = this.posService.getSales(); 

  // Controladores de estado local para los modales elásticos de analítica e inspección
  readonly isAlertModalOpen = signal<boolean>(false);
  readonly isLast7DaysModalOpen = signal<boolean>(false);
  readonly isMonthModalOpen = signal<boolean>(false);

  // 🚀 REFRESCAR AL ABRIR EL PANEL DE CONTROL (Sincroniza transacciones al segundo)
  ngOnInit(): void {
    if (typeof (this.posService as any).load === 'function') {
      (this.posService as any).load();
    }
    if (typeof (this.productService as any).load === 'function') {
      (this.productService as any).load();
    }
    if (typeof (this.stockService as any).load === 'function') {
      (this.stockService as any).load();
    }
  }

  // 📊 INDICADORES BASE EXISTENTES
  readonly totalProductsCount = computed(() => this.products().length);
  
  readonly totalInventoryValue = computed(() => {
    return this.products().reduce((total, prod) => {
      // Manejo defensivo por si buyprice ya viene mapeado como string o número puro en el dominio
      const priceVal = typeof prod.buyprice === 'number' 
        ? prod.buyprice 
        : (Number(String(prod.buyprice || '').replace(/[^0-9]/g, '')) || 0);
      return total + (prod.stock * priceVal);
    }, 0);
  });

  // Lista completa de existencias en peligro (Crítico o Bajo) para el modal flotante
  readonly allCriticalProducts = computed(() => {
    return this.products().filter(p => p.status === 'Crítico' || p.status === 'Bajo');
  });

  readonly criticalStockCount = computed(() => this.allCriticalProducts().length);
  readonly recentActivity = computed(() => this.movements().slice(0, 4));
  readonly tableAlertsList = computed(() => this.allCriticalProducts().slice(0, 3));

  // 📈 ANALÍTICA CRONOLÓGICA DE VENTAS EN VIVO (Métricas de Tarjetas)
  
  // Lista de boletas filtradas emitidas dentro de los últimos 7 días corridos
  readonly last7DaysSalesList = computed(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return this.sales().filter(sale => new Date(sale.createdAt) >= sevenDaysAgo);
  });

  // 1. Ventas Semanales Reducidas (Muestra el total en la tarjeta KPI)
  readonly weeklySalesTotal = computed(() => {
    return this.last7DaysSalesList().reduce((sum, sale) => sum + sale.total, 0);
  });

  // Lista de boletas filtradas emitidas estrictamente en el mes calendario actual
  readonly currentMonthSalesList = computed(() => {
    const now = new Date();
    return this.sales().filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
    });
  });

  // 2. Ventas Mensuales Reducidas (Muestra el total en la tarjeta KPI)
  readonly currentMonthSalesTotal = computed(() => {
    return this.currentMonthSalesList().reduce((sum, sale) => sum + sale.total, 0);
  });

  // 3. Comparativa Porcentual Financiera con el Mes Pasado
  readonly monthComparison = computed(() => {
    const now = new Date();
    
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

    const difference = currentSales - prevMonthSales;
    const percentage = Math.round((difference / prevMonthSales) * 100);

    return {
      percentage: Math.abs(percentage),
      isUp: percentage >= 0,
      label: percentage >= 0 ? `más que el mes pasado` : `menos que el mes pasado`
    };
  });

    // 🚀 REPARACIÓN ABSOLUTA: Procesa la variable 'itemsSnapshot' inyectada por el repositorio
  private readonly productSalesCountMatrix = computed(() => {
    const matrix: { [productName: string]: { quantity: number; category: string; totalRevenue: number } } = {};

    this.sales().forEach((sale: any) => {
      // Capturamos el snapshot de artículos que ahora sí viene dentro de la boleta mapeada
      const rawItems = sale.itemsSnapshot;
      
      if (!rawItems) return; // Si la boleta no tiene desglose de ítems, salta a la siguiente

      let items: any[] = [];

      // Deserializamos si viene como texto string o lo asignamos directo si es un objeto/array JSONB
      if (typeof rawItems === 'string') {
        try {
          items = JSON.parse(rawItems);
        } catch (e) {
          console.warn('Error al deserializar texto JSON de boleta:', e);
          return;
        }
      } else if (Array.isArray(rawItems)) {
        items = rawItems;
      } else if (rawItems && typeof rawItems === 'object') {
        items = Object.values(rawItems);
      }

      // Recorremos los artículos y acumulamos sus volúmenes comerciales
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.product?.name || item.name || 'Artículo General';
          const qty = Number(item.quantity || item.cantidad || 1);
          const category = item.product?.category || item.category || 'Varios';
          const subtotal = Number(item.subtotal || item.total || (Number(item.price || item.product?.price || 0) * qty) || 0);

          if (name && name !== 'Artículo General') {
            if (!matrix[name]) {
              matrix[name] = { quantity: 0, category, totalRevenue: 0 };
            }
            matrix[name].quantity += qty;
            matrix[name].totalRevenue += subtotal;
          }
        });
      }
    });


    return Object.entries(matrix).map(([name, data]) => ({
      name,
      ...data
    }));
  });





  // 📈 RANKING 1: Top 3 Productos MÁS Vendidos corporativos
  readonly top3MostSold = computed(() => {
    return [...this.productSalesCountMatrix()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 3);
  });

  // 📉 RANKING 2: Top 3 Productos MENOS Vendidos corporativos
  readonly top3LeastSold = computed(() => {
    return [...this.productSalesCountMatrix()]
      .filter(p => p.quantity > 0) // Excluye productos con 0 rotación para una métrica contable fidedigna
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, 3);
  });

  // Auxiliares interactivos de la interfaz de usuario
  openAlertsModal(): void { if (this.criticalStockCount() > 0) this.isAlertModalOpen.set(true); }
  closeAlertsModal(): void { this.isAlertModalOpen.set(false); }
  
  openLast7DaysModal(): void { this.isLast7DaysModalOpen.set(true); }
  openMonthModal(): void { this.isMonthModalOpen.set(true); }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
