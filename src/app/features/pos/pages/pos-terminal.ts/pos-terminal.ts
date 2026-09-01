import { Component, signal, computed, inject } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { POS_REPOSITORY } from '../../data-acces/pos.repository';
import { CartItem, SaleInvoice } from '../../models/pos.models';
import { Product } from '../../../products/models/product.model';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  imports: [], // Control flow nativo de Angular (@if, @for) en el HTML
  templateUrl: './pos-terminal.html'
})
export class PosTerminalComponent {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);

  // 📦 Signals Core del Estado del Terminal POS
  readonly products = this.productRepo.getProducts();
  readonly searchQuery = signal<string>('');
  readonly cart = signal<CartItem[]>([]);
  readonly errorMessage = signal<string>('');
  
  // Soporta los tres botones del HTML táctil para evitar errores de solapamiento de tipos
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

  // 📊 Totales Financieros Computados Reactivamente (Desglose de IVA)
  readonly cartSubtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.subtotal, 0);
  });
  readonly cartTax = computed(() => Math.round(this.cartSubtotal() * 0.19)); // IVA del 19%
  readonly cartTotal = computed(() => this.cartSubtotal() + this.cartTax());

  // Actualiza la query del buscador al digitar en caliente
  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  // Modifica el método financiero activo desde los clics del HTML
  updatePaymentMethod(method: 'Efectivo' | 'Debito' | 'Credito'): void {
    this.selectedPayment.set(method);
  }

  // 🛒 Gestión Inmutable de la Canasta de Ventas con Auditoría de Stock Máximo
  addToCart(product: Product): void {
    const currentCart = this.cart();
    const existingItem = currentCart.find(item => item.product.id === product.id);
    
    // Normalización defensiva por si el precio llega formateado como texto de moneda ($)
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

  // 🎛️ Modificar cantidad desde botones + / - o escribiendo directamente
  updateItemQuantity(productId: string, newQuantity: number): void {
    if (isNaN(newQuantity) || newQuantity < 1) return;

    const currentCart = this.cart();
    const cartItem = currentCart.find(item => item.product.id === productId);
    if (!cartItem) return;

    // Validación estricta contra el stock de la base de datos
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

  // ⌨️ Controlar la entrada manual por teclado en el input de la canasta
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

  // Enlace semántico con el botón del layout HTML
  async checkoutVenta(): Promise<void> {
    await this.checkout();
  }

  // 📥 Liquidación e Inserción de la Factura en Supabase en Bloque
  async checkout(): Promise<void> {
    if (this.cart().length === 0) return;

    try {
      // Mapeo adaptativo para unificar Débito/Crédito en 'Tarjetas' en el backend
      const apiPaymentMethod: 'Efectivo' | 'Tarjetas' | 'Transferencia' = 
        (this.selectedPayment() === 'Debito' || this.selectedPayment() === 'Credito')
          ? 'Tarjetas'
          : this.selectedPayment() as 'Efectivo' | 'Transferencia';

      const invoice: SaleInvoice = {
        id: `POS-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
        items: this.cart(),
        subtotal: this.cartSubtotal(),
        tax: this.cartTax(),
        total: this.cartTotal(),
        paymentMethod: apiPaymentMethod,
        createdAt: new Date().toISOString(),
        operator: 'Carlos Mendez'
      };

      // 1. Guardar registro histórico de la venta en Postgres
      await this.posRepo.processSale(invoice);

      // 2. Descontar existencias físicas en bloque bajo la regla del 10% de alertas corporativas
      for (const item of this.cart()) {
        const nextStock = item.product.stock - item.quantity;
        let nextStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
        const threshold = item.product.minStock * 0.10;

        if (nextStock <= threshold) {
          nextStatus = 'Crítico';
        } else if (nextStock < item.product.minStock) {
          nextStatus = 'Bajo';
        }

        this.productRepo.updateProduct({
          ...item.product,
          stock: nextStock,
          status: nextStatus
        });
      }

      this.clearCart();
      alert(`¡Venta procesada con éxito! Transacción: ${invoice.id}`);
    } catch (err) {
      this.errorMessage.set('Error en el servidor central al procesar la venta. Inténtalo de nuevo.');
    }
  }

  // Formateador estándar de salida monetaria (COP)
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
