import { Component, signal, computed, inject, OnInit } from '@angular/core'; // 📌 Importado OnInit
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { SUPPLIER_REPOSITORY } from '../../../suppliers/data-access/supplier.repository';
import { PURCHASE_REPOSITORY } from '../../data-access/purchase.repository';
import { STOCK_REPOSITORY } from '../../../inventory/stock/data-access/stock.repository';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { LoadingService } from '../../../../core/services/loading.service'; // 📌 SERVICIO GLOBAL INYECTADO
import { Product } from '../../../products/models/product.model';
import { PurchaseItem, PurchaseOrder } from '../../models/purchase.model';
import { StockMovement } from '../../../inventory/stock/models/stock.model';

@Component({
  selector: 'app-purchase-order',
  standalone: true,
  imports: [], // Control flow nativo en plantilla (@if, @for)
  templateUrl: './purchase-order.html',
})
export class PurchaseOrderComponent implements OnInit {
  // 📌 Implementada la interfaz OnInit
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly supplierRepo = inject(SUPPLIER_REPOSITORY);
  private readonly purchaseRepo = inject(PURCHASE_REPOSITORY);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly loadingService = inject(LoadingService); // 📌 Inyección funcional de carga

  // Signals de Datos Remotos
  readonly products = this.productRepo.getProducts();
  readonly suppliers = this.supplierRepo.getSuppliers();
  readonly purchaseOrders = this.purchaseRepo.getOrders();

  // Estados Locales Reactivos
  readonly selectedSupplierName = signal<string>('');
  readonly purchaseCart = signal<PurchaseItem[]>([]);
  readonly errorMessage = signal<string>('');

  // Controles Avanzados de UI y Facturación
  readonly ordersInTransit = signal<{ [key: string]: boolean }>({});
  readonly customQuantities = signal<{ [key: string]: string }>({});
  readonly invoiceNumbers = signal<{ [key: string]: string }>({});

  // 🚀 CARGA DE APERTURA: Sincroniza la bitácora con Supabase al ingresar a la vista
  ngOnInit(): void {
    this.syncPurchasesFromSupabase();
  }

  // 🔄 REFRESCAR RED: Despliega la barra de progreso elástica mientras descarga el histórico
  async syncPurchasesFromSupabase(): Promise<void> {
    console.log('🔄 Sincronizando órdenes de compra de B&R Solutions desde Supabase...');
    this.loadingService.show('Descargando historial de lotes y proveedores remotos...');

    try {
      const promesas: Promise<void>[] = [];

      if (this.purchaseRepo && 'loadOrders' in this.purchaseRepo) {
        promesas.push((this.purchaseRepo as any).loadOrders());
      } else if (this.purchaseRepo && 'load' in this.purchaseRepo) {
        promesas.push((this.purchaseRepo as any).load());
      }

      if (this.supplierRepo && 'load' in this.supplierRepo) {
        promesas.push((this.supplierRepo as any).load());
      }

      if (promesas.length > 0) {
        await Promise.all(promesas);
      }

      this.loadingService.hide(); // 100% fluido al completar la red
    } catch (error) {
      console.error('Error al descargar bitácora logística:', error);
      this.loadingService.hide();
    }
  }

  // Filtro inteligente de quiebres de inventario
  readonly criticalSuggestedProducts = computed(() => {
    const supplier = this.selectedSupplierName();
    return this.products().filter(
      (p) => p.supplier === supplier && (p.status === 'Crítico' || p.status === 'Bajo'),
    );
  });

  readonly orderTotal = computed(() => {
    return this.purchaseCart().reduce((sum, item) => sum + item.subtotal, 0);
  });

  onSelectSupplier(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    this.selectedSupplierName.set(val);
    this.purchaseCart.set([]);
    this.customQuantities.set({});
  }

  addSuggestedToOrder(product: Product, qty: number): void {
    if (qty <= 0 || isNaN(qty)) return;
    const currentCart = this.purchaseCart();
    const existing = currentCart.find((item) => item.product.id === product.id);
    const cost = Number(product.buyprice.replace(/[^0-9]/g, '')) || 0;

    if (existing) {
      this.purchaseCart.update((items) =>
        items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + qty, subtotal: (i.quantity + qty) * cost }
            : i,
        ),
      );
    } else {
      this.purchaseCart.update((items) => [
        ...items,
        { product, quantity: qty, costPrice: cost, subtotal: qty * cost },
      ]);
    }
  }

  onCustomQtyInput(e: Event, productId: string): void {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.customQuantities.update((dict) => ({ ...dict, [productId]: input.value }));
  }

  onInvoiceNumberInput(e: Event, orderId: string): void {
    const input = e.target as HTMLInputElement;
    this.invoiceNumbers.update((dict) => ({ ...dict, [orderId]: input.value }));
  }

  markAsInTransit(orderId: string): void {
    this.ordersInTransit.update((dict) => ({ ...dict, [orderId]: true }));
  }

  parseInt(val: string, radix: number): number {
    return parseInt(val, radix) || 0;
  }

  // 🚀 EMISIÓN DE ORDEN ASÍNCRONA CON PORCENTAJE REAL
  async placeOrder(): Promise<void> {
    if (this.purchaseCart().length === 0) return;

    // Encendemos el overlay global reactivo unificado
    this.loadingService.show('Despachando solicitud de reabastecimiento masivo a la nube...');
    const orderId = `OC-${crypto.randomUUID().substring(0, 5).toUpperCase()}`;

    const newOrder: PurchaseOrder = {
      id: orderId,
      supplierName: this.selectedSupplierName(),
      items: this.purchaseCart(),
      totalAmount: this.orderTotal(),
      status: 'Solicitado',
      createdAt: new Date().toISOString(),
      operator: this.authService.currentOperatorName(),
    };

    try {
      await this.purchaseRepo.createOrder(newOrder);

      this.purchaseCart.set([]);
      this.customQuantities.set({});
      this.loadingService.hide(); // Cierre automático al 100%
      alert(`Orden de Compra ${orderId} registrada con éxito en Supabase.`);
    } catch (err) {
      this.loadingService.hide();
      this.errorMessage.set('Fallo de red al despachar la requisición.');
    }
  }

  // 🚀 ARRIBO FISCAL DE BODEGA CON TIMBRADO DE NOTIFICACIONES AUTOMÁTICO
  async acceptIncomingDelivery(order: PurchaseOrder): Promise<void> {
    const billNumber = this.invoiceNumbers()[order.id]?.trim() || 'SIN-FACTURA';

    // Bloquea el canvas con el contador de avance de la base de datos
    this.loadingService.show(
      `Confirmando arribo físico del camión y cargando Kardex de OC #${order.id}...`,
    );

    try {
      // 1. Firmamos la orden en estado 'Recibido'
      await this.purchaseRepo.receiveOrder(order.id);

      // 2. Incrementamos existencias en bloque
      for (const item of order.items) {
        const targetProduct = this.products().find((p) => p.id === item.product.id);
        if (!targetProduct) continue;

        const nextStock = targetProduct.stock + item.quantity;
        let nextStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
        if (nextStock <= targetProduct.minStock * 0.1) nextStatus = 'Crítico';
        else if (nextStock < targetProduct.minStock) nextStatus = 'Bajo';

        await this.productRepo.updateProduct({
          ...targetProduct,
          stock: nextStock,
          status: nextStatus,
        });

        const automatedIngreso: StockMovement = {
          id: `MOV-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
          productName: targetProduct.name,
          type: 'Ingreso',
          quantity: item.quantity,
          reason: `Abastecimiento masivo bajo Factura Distribuidor #${billNumber} en OC #${order.id}`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          operator: this.authService.currentOperatorName(),
        };
        await this.stockRepo.registerMovement(automatedIngreso);
      }

      // 3. Empujamos el aviso a la campana del Header
      this.notificationService.addNotification({
        title: 'Abastecimiento Exitoso',
        message: `Lote de la Orden ${order.id} ingresado bajo Factura: ${billNumber}. Almacén actualizado.`,
        type: 'info',
        timeLabel: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      });

      // 4. Forzamos recarga limpia del catálogo
      if (this.productRepo && 'loadProductsFromSupabase' in this.productRepo) {
        await (this.productRepo as any).loadProductsFromSupabase();
      }

      // Sincronizamos la bitácora local
      await this.syncPurchasesFromSupabase();

      this.loadingService.hide();
      alert(`Lote de la Orden ${order.id} consolidado correctamente.`);
    } catch (err) {
      this.loadingService.hide();
      this.errorMessage.set('Error crítico al procesar el ingreso físico del camión.');
    }
  }

  formatVisual(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  }
}
