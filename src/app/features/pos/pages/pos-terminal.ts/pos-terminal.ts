import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core'; // 📌 Importado OnDestroy
import { Router, NavigationEnd } from '@angular/router'; // 📌 Importados servicios de ruta
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { POS_REPOSITORY } from '../../data-acces/pos.repository';
import { STOCK_REPOSITORY } from '../../../inventory/stock/data-access/stock.repository';
import { CartItem, SaleInvoice } from '../../models/pos.models';
import { Product } from '../../../products/models/product.model';
import { StockMovement } from '../../../inventory/stock/models/stock.model';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [], 
  templateUrl: './pos-terminal.html'
})
export class PosTerminalComponent implements OnInit, OnDestroy {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly router = inject(Router); // 📌 Inyectado el enrutador corporativo

  private navSubscription!: Subscription; // Variable para limpiar la memoria al salir

  // 📦 Signals Core del Estado del Terminal POS
  readonly products = this.productRepo.getProducts();
  readonly searchQuery = signal<string>('');
  readonly cart = signal<CartItem[]>([]);
  readonly errorMessage = signal<string>('');
  readonly selectedPayment = signal<'Efectivo' | 'Debito' | 'Credito' | 'Transferencia'>('Efectivo');

  // 🔗 Puentes y Aliases reactivos de lectura para el archivo HTML
  readonly paymentMethod = this.selectedPayment.asReadonly();
  readonly totalCart = computed(() => this.cartTotal());

  // 🔍 Filtro en tiempo real para el buscador predictivo por Nombre o SKU
  readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    return this.products().filter(p => 
      (p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)) && p.stock > 0
    );
  });

  // 📊 Totales Financieros Computados Reactivamente
  readonly cartSubtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.subtotal, 0);
  });
  readonly cartTax = computed(() => Math.round(this.cartSubtotal() * 0.19)); 
  readonly cartTotal = computed(() => this.cartSubtotal() + this.cartTax());

  // 🚀 ESCUCHA ACTIVA DE PESTAÑAS
  ngOnInit(): void {
  // 1. Carga inicial limpia al abrir la pantalla por primera vez
  this.resetAndReloadTerminal();

  // 2. FILTRADO SEGURO: Escucha el cambio de pestaña, pero actúa SOLO si regresas al POS
  this.navSubscription = this.router.events.pipe(
    filter(event => event instanceof NavigationEnd)
  ).subscribe((event: any) => {
    // Obtenemos la URL actual limpia (ejemplo: '/inventory/pos')
    const currentUrl = event.urlAfterRedirects || event.url;
    
    // 📌 Cambia '/pos' por la palabra exacta que tenga la URL de tu terminal de ventas
    if (currentUrl.includes('/pos') || currentUrl.endsWith('terminal')) {
      console.log('🔄 Sincronizando existencias del POS de B&R Solutions de forma segura...');
      this.resetAndReloadTerminal();
    }
  });
}


  // 🧹 Liberación de memoria al destruir el layout
  ngOnDestroy(): void {
    if (this.navSubscription) {
      this.navSubscription.unsubscribe();
    }
  }

  private resetAndReloadTerminal(): void {
  
  // 1. Limpieza absoluta del estado del formulario local
  this.cart.set([]);
  this.errorMessage.set('');
  this.searchQuery.set('');

  // 2. FORZAR REFRESCO DIRECTO DEL CONTENEDOR EN SUPABASE
  // Evaluamos de manera segura qué método de actualización tiene programado tu repositorio de productos
  if (typeof (this.productRepo as any).refreshProducts === 'function') {
    (this.productRepo as any).refreshProducts();
  } else if (typeof (this.productRepo as any).load === 'function') {
    (this.productRepo as any).load();
  } else if (typeof (this.productRepo as any).getItemsSignal === 'function') {
    // Si tu servicio hereda de GenericSupabaseRepository, esto despertará al motor reactivo
    (this.productRepo as any).getItemsSignal();
  }

  // 3. TRUCO DE RE-RENDERIZADO (Fallback de Seguridad)
  // Forzamos un micro-parpadeo en la query de búsqueda para obligar al 'computed'
  // de filteredProducts a volver a ejecutarse y redibujar el catálogo en la pantalla
  const currentQuery = this.searchQuery();
  this.searchQuery.set(' '); 
  setTimeout(() => this.searchQuery.set(currentQuery), 50);
}

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  updatePaymentMethod(method: 'Efectivo' | 'Debito' | 'Credito'): void {
    this.selectedPayment.set(method);
  }

  addToCart(product: Product): void {
    const currentCart = this.cart();
    const existingItem = currentCart.find(item => item.product.id === product.id);
    const cleanPrice = typeof product.price === 'number' 
      ? product.price 
      : Number((product.price as string).replace(/[^0-9]/g, '')) || 0;

    if (existingItem) {
      this.updateItemQuantity(product.id, existingItem.quantity + 1);
    } else {
      this.cart.update(items => [...items, { product, quantity: 1, subtotal: cleanPrice }]);
      this.errorMessage.set('');
    }
  }

  updateItemQuantity(productId: string, newQuantity: number): void {
    if (isNaN(newQuantity) || newQuantity < 1) return;

    const currentCart = this.cart();
    const cartItem = currentCart.find(item => item.product.id === productId);
    if (!cartItem) return;

    if (newQuantity > cartItem.product.stock) {
      this.errorMessage.set(
        `Acción rechazada: Solo quedan ${cartItem.product.stock} unidades disponibles de "${cartItem.product.name}".`
      );
      return;
    }

    const cleanPrice = typeof cartItem.product.price === 'number' 
      ? cartItem.product.price 
      : Number((cartItem.product.price as string).replace(/[^0-9]/g, '')) || 0;

    this.cart.update(items => items.map(item => 
      item.product.id === productId 
        ? { ...item, quantity: newQuantity, subtotal: newQuantity * cleanPrice }
        : item
    ));
    this.errorMessage.set('');
  }

  onCartQuantityInput(event: Event, productId: string): void {
    const inputElement = event.target as HTMLInputElement;
    const newQty = parseInt(inputElement.value, 10);
    if (!isNaN(newQty)) {
      this.updateItemQuantity(productId, newQty);
    }
  }

  removeFromCart(productId: string): void {
    this.cart.update(items => items.filter(item => item.product.id !== productId));
  }

  clearCart(): void {
    this.cart.set([]);
    this.errorMessage.set('');
  }

  async checkoutVenta(): Promise<void> {
    await this.checkout();
  }

  async checkout(): Promise<void> {
  if (this.cart().length === 0) return;

  try {
    const apiPaymentMethod: 'Efectivo' | 'Tarjetas' | 'Transferencia' = 
      (this.selectedPayment() === 'Debito' || this.selectedPayment() === 'Credito')
        ? 'Tarjetas'
        : this.selectedPayment() as 'Efectivo' | 'Transferencia';

    const saleId = `POS-${crypto.randomUUID().substring(0, 5).toUpperCase()}`;

    const invoice: SaleInvoice = {
      id: saleId,
      items: this.cart(),
      subtotal: this.cartSubtotal(),
      tax: this.cartTax(),
      total: this.cartTotal(),
      paymentMethod: apiPaymentMethod,
      createdAt: new Date().toISOString(),
      operator: 'Carlos Mendez',
      cashClosureId: undefined
    };

    // 1. Guardar la boleta principal primero (Petición base indispensable)
    await this.posRepo.processSale(invoice);

    // 🚀 2. CREAMOS UNA COLA DE PROMESAS EN PARALELO
    // En lugar de usar 'await' por cada producto, preparamos las peticiones en memoria
    const promesasDeInventario: Promise<void>[] = [];

    for (const item of this.cart()) {
      const nextStock = item.product.stock - item.quantity;
      let nextStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
      const threshold = item.product.minStock * 0.10;

      if (nextStock <= threshold) {
        nextStatus = 'Crítico';
      } else if (nextStock < item.product.minStock) {
        nextStatus = 'Bajo';
      }

      // Preparamos la actualización del producto (Sin poner await adelante)
      const pUpdate = this.productRepo.updateProduct({
        ...item.product,
        stock: nextStock,
        status: nextStatus
      });
      promesasDeInventario.push(pUpdate as any);

      // Preparamos el movimiento de auditoría en Kardex
      const automatedMovement: StockMovement = {
        id: `MOV-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
        productName: item.product.name,
        type: 'Egreso', 
        quantity: -item.quantity, 
        reason: `Despacho automático por Venta POS en Boleta de Venta #${saleId}`,
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        operator: invoice.operator
      };

      // Agregamos la petición de Kardex a la cola asíncrona
      if (typeof (this.stockRepo as any).addMovement === 'function') {
        promesasDeInventario.push((this.stockRepo as any).addMovement(automatedMovement));
      } else if (typeof (this.stockRepo as any).addItem === 'function') {
        promesasDeInventario.push((this.stockRepo as any).addItem(automatedMovement));
      }
    }

    // 🚀 3. DISPARO SIMULTÁNEO:
    // Se envían todas las actualizaciones de stock y Kardex juntas en un solo viaje de internet.
    // La venta se completará en lo que tarde la petición más lenta (aprox 600ms en total).
    await Promise.all(promesasDeInventario);

    this.clearCart();
    alert(`¡Venta procesada con éxito! Transacción: ${invoice.id}`);
  } catch (err) {
    this.errorMessage.set('Error en el servidor central al procesar la venta. Inténtalo de nuevo.');
  }
}


  formatVisual(value: number | string): string {
    const numValue = typeof value === 'number' 
      ? value 
      : Number(String(value).replace(/[^0-9]/g, '')) || 0;

    return new Intl.NumberFormat('es-CO', { 
      style: 'currency', 
      currency: 'COP', 
      maximumFractionDigits: 0 
    }).format(numValue);
  }
}
