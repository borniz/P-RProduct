import { Component, signal, computed, inject } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { SUPPLIER_REPOSITORY } from '../../../suppliers/data-access/supplier.repository';
import { PURCHASE_REPOSITORY } from '../../data-access/purchase.repository';
import { STOCK_REPOSITORY } from '../../../inventory/stock/data-access/stock.repository';
import { AuthService } from '../../../../core/services/auth.service';
import { Product } from '../../../products/models/product.model';
import { PurchaseItem, PurchaseOrder } from '../../models/purchase.model';
import { StockMovement } from '../../../inventory/stock/models/stock.model';

@Component({
  selector: 'app-purchase-order',
  standalone: true,
  imports: [], // Control flow nativo de Angular (@if, @for)
  templateUrl: './purchase-order.html',
})
export class PurchaseOrderComponent {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly supplierRepo = inject(SUPPLIER_REPOSITORY);
  private readonly purchaseRepo = inject(PURCHASE_REPOSITORY);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly authService = inject(AuthService);

  // Signals Core de Entrada de Datos de la nube
  readonly products = this.productRepo.getProducts();
  readonly suppliers = this.supplierRepo.getSuppliers();
  readonly purchaseOrders = this.purchaseRepo.getOrders();

  // Estados de control de UI locales
  readonly selectedSupplierName = signal<string>('');
  readonly purchaseCart = signal<PurchaseItem[]>([]);
  readonly errorMessage = signal<string>('');

  // 🔍 SUGERENCIA INTELIGENTE ERP: Filtra los productos en stock crítico que pertenezcan al proveedor seleccionado
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
    this.purchaseCart.set([]); // Reseteamos la canasta si cambia de distribuidor
  }

  // Añade un ítem al carro de compras masivo
  addSuggestedToOrder(product: Product, qty: number = 20): void {
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

  // 🚀 ACCIÓN A: Genera la orden en estado 'Solicitado'
  async placeOrder(): Promise<void> {
    if (this.purchaseCart().length === 0) return;
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

    await this.purchaseRepo.createOrder(newOrder);
    this.purchaseCart.set([]);
    alert(`Orden de Compra ${orderId} emitida exitosamente.`);
  }

  // 🚀 ACCIÓN B: CONSOLIDACIÓN Y COHESIÓN TOTAL EN LA NUBE (Ingresa el lote físico a bodega)
  async acceptIncomingDelivery(order: PurchaseOrder): Promise<void> {
    try {
      // 1. Cambiamos el estatus de la orden a 'Recibido' en Supabase
      await this.purchaseRepo.receiveOrder(order.id);

      // 2. Recorremos en bloque los materiales para sumarlos al inventario maestro y auditar el Kardex
      for (const item of order.items) {
        // Localizamos el producto actual para no perder coherencia
        const targetProduct = this.products().find((p) => p.id === item.product.id);
        if (!targetProduct) continue;

        const nextStock = targetProduct.stock + item.quantity;

        // Recalcular alertas corporativas bajo la regla del 10%
        let nextStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
        if (nextStock <= targetProduct.minStock * 0.1) nextStatus = 'Crítico';
        else if (nextStock < targetProduct.minStock) nextStatus = 'Bajo';

        // Modificamos el inventario en la nube
        await this.productRepo.updateProduct({
          ...targetProduct,
          stock: nextStock,
          status: nextStatus,
        });

        // Inyectamos de forma automática la bitácora de auditoría al Kardex
        const automatedIngreso: StockMovement = {
          id: `MOV-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
          productName: targetProduct.name,
          type: 'Ingreso', // Incremento de stock formal
          quantity: item.quantity,
          reason: `Reabastecimiento masivo según Recepción de Orden de Compra #${order.id}`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          operator: this.authService.currentOperatorName(),
        };

        await this.stockRepo.registerMovement(automatedIngreso);
      }
      for (const item of order.items) {
        // ... tu lógica de actualización de productos y Kardex automático
      }

      // 📌 ACCIÓN RECONECTADA: Fuerza al repositorio de productos real de Supabase
      // a descargar las nuevas existencias físicas para que todo el ERP sincronice en caliente
      if (this.productRepo && 'loadProductsFromSupabase' in this.productRepo) {
        await (this.productRepo as any).loadProductsFromSupabase();
      }

      alert(`Lote de la Orden ${order.id} ingresado a bodega. Catálogo y Kardex actualizados.`);
    } catch (err) {
      this.errorMessage.set('Fallo al procesar el ingreso físico del lote.');
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
