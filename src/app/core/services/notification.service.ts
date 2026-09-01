import { Injectable, inject, computed, Signal } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../features/products/data-access/product.repository';
import { STOCK_REPOSITORY } from '../../features/inventory/stock/data-access/stock.repository';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info'; // danger = agotado, warning = por acabarse, info = movimiento
  timeLabel: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly stockService = inject(STOCK_REPOSITORY);

  // Lectura directa de las señales vivas de Supabase
  private readonly products = this.productService.getProducts();
  private readonly movements = this.stockService.getMovements();

  // 📌 SEÑAL COMPUTADA GLOBAL: El motor inteligente de alertas unificadas
  readonly notifications: Signal<AppNotification[]> = computed(() => {
    const list: AppNotification[] = [];

    // 🚨 1. EVALUAR ALERTAS DE INVENTARIO (Analiza el catálogo de productos en vivo)
    this.products().forEach(prod => {
      if (prod.stock === 0) {
        list.push({
          id: `NOT-AGOT-${prod.id}`,
          title: '¡Inventario Agotado!',
          message: `El artículo "${prod.name}" se ha quedado sin existencias físicas en bodega.`,
          type: 'danger',
          timeLabel: 'Alerta Crítica'
        });
      } else if (prod.stock <= prod.minStock) {
        list.push({
          id: `NOT-BAJO-${prod.id}`,
          title: 'Stock Mínimo Superado',
          message: `El artículo "${prod.name}" tiene solo ${prod.stock} unidades. Requiere reabastecimiento urgente.`,
          type: 'warning',
          timeLabel: 'Atención'
        });
      }
    });

    // 📦 2. EVALUAR REGISTROS DE KARDEX (Muestra los últimos 3 movimientos de Supabase)
    this.movements().slice(0, 3).forEach(mov => {
      const isIngreso = mov.type === 'Ingreso';
      const qtyAbs = Math.abs(mov.quantity);
      
      list.push({
        id: `NOT-MOV-${mov.id}`,
        title: `Movimiento: ${mov.type}`,
        message: `Se registraron ${qtyAbs} unidades de "${mov.productName}". Motivo: ${mov.reason}.`,
        type: 'info',
        timeLabel: mov.date.substring(11, 16) // Extrae la hora (HH:MM)
      });
    });

    return list;
  });

  // 🔔 Contador reactivo para la burbuja roja encima del icono de la campana en el header
  readonly unreadCount = computed(() => this.notifications().length);
}
