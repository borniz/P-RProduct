import { Component, signal, computed, inject, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { RouterModule } from '@angular/router'; // 📌 Importado para dar soporte a routerLink en la vista
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { PRODUCT_REPOSITORY } from '../../../products/data-access/product.repository';
import { POS_REPOSITORY } from '../../data-acces/pos.repository';
import { STOCK_REPOSITORY } from '../../../inventory/stock/data-access/stock.repository';
import { CartItem, SaleInvoice } from '../../models/pos.models';
import { Product } from '../../../products/models/product.model';
import { StockMovement } from '../../../inventory/stock/models/stock.model';
import { AuthService } from '../../../../core/services/auth.service';

// 📌 IMPORTACIONES CORE DEL MOTOR DE ESCANEO ÓPTICO
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';
import { SettingsService } from '../../../../core/services/settings.service';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-pos-terminal',
  standalone: true,
  // 📌 SOLUCCIÓN INTEGRAL AL ERROR NG8001: Se inyecta el ZXingScannerModule dentro de los imports
  imports: [RouterModule, ZXingScannerModule],
  templateUrl: './pos-terminal.html',
})
export class PosTerminalComponent implements OnInit, OnDestroy {
  private readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly router = inject(Router);
  private readonly settingsService = inject(SettingsService);

  private navSubscription!: Subscription;

  // 📦 Signals Core del Estado del Terminal POS
  readonly products = this.productRepo.getProducts();
  readonly searchQuery = signal<string>('');
  readonly cart = signal<CartItem[]>([]);
  readonly errorMessage = signal<string>('');
  readonly selectedPayment = signal<'Efectivo' | 'Debito' | 'Credito' | 'Transferencia'>('Efectivo');
  readonly isScannerActive = signal<boolean>(false);

  // 🔗 Puentes y Aliases reactivos de lectura para el archivo HTML
  readonly paymentMethod = this.selectedPayment.asReadonly();
  readonly totalCart = computed(() => this.cartTotal());
  
  // Formatos de códigos de barra industriales permitidos
  readonly allowedFormats = [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.CODE_128,
    BarcodeFormat.QR_CODE,
  ];

  

  // 🔍 Filtro en tiempo real para el buscador predictivo por Nombre o SKU
  readonly filteredProducts = computed(() => {
  const query = this.searchQuery().toLowerCase().trim();
  const all = this.products().filter(p => p.stock > 0);
  
  if (!query) {
    return all.slice(0, 15); // 🚀 Solo pinta las primeras 15 herramientas para acelerar el LCP a milisegundos
  }
  return all.filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
});

  // 📊 Totales Financieros Computados Reactivamente
  readonly cartSubtotal = computed(() => {
    return this.cart().reduce((sum, item) => sum + item.subtotal, 0);
  });
  readonly cartTax = computed(() => {
  return Math.round(this.cartSubtotal() * this.settingsService.taxRate());
});

readonly cartTotal = computed(() => this.cartSubtotal() + this.cartTax());

  // 🚀 ESCUCHA ACTIVA DE PESTAÑAS (Sincronización multilayout)
  ngOnInit(): void {
    this.resetAndReloadTerminal();

    this.navSubscription = this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const currentUrl = event.urlAfterRedirects || event.url;
        if (currentUrl.includes('/pos') || currentUrl.endsWith('terminal')) {
          console.log('🔄 Sincronizando existencias del POS de B&R Solutions de forma segura...');
          this.resetAndReloadTerminal();
        }
      });
  }

  ngOnDestroy(): void {
    if (this.navSubscription) {
      this.navSubscription.unsubscribe();
    }
  }
  // 🚀 SOLUCCIÓN AL ERROR TS2345: Firma tipada como 'any' para recibir limpiamente el string del escáner
  onBarcodeScanSuccess(scannedCode: any): void {
    const codeString = String(scannedCode || '').trim().toUpperCase();
    if (!codeString) return;

    // Buscamos en caliente el producto en el catálogo cuyo SKU coincida con la lectura óptica
    const matchedProduct = this.products().find(
      (p) => p.sku.trim().toUpperCase() === codeString,
    );

    if (matchedProduct) {
      // Si el artículo existe y tiene existencias, lo inyectamos directamente al carrito
      this.addToCart(matchedProduct);

      // Apagamos la cámara por usabilidad tras el escaneo exitoso
      this.isScannerActive.set(false);
      this.errorMessage.set('');

      // Emitimos un sutil sonido nativo de confirmación (Beep)
      this.playScanBeep();
    } else {
      this.errorMessage.set(
        `Código [${codeString}] leído correctamente, pero no está asignado a ningún producto en el catálogo.`,
      );
    }
  }

  private playScanBeep(): void {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.log('Audio no soportado en este dispositivo');
    }
  }

  toggleCameraScanner(): void {
    this.isScannerActive.update((current) => !current);
    this.errorMessage.set('');
  }

  private resetAndReloadTerminal(): void {
    this.cart.set([]);
    this.errorMessage.set('');
    this.searchQuery.set('');

    if (typeof (this.productRepo as any).refreshProducts === 'function') {
      (this.productRepo as any).refreshProducts();
    } else if (typeof (this.productRepo as any).load === 'function') {
      (this.productRepo as any).load();
    } else if (typeof (this.productRepo as any).getItemsSignal === 'function') {
      (this.productRepo as any).getItemsSignal();
    }

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
    const existingItem = currentCart.find((item) => item.product.id === product.id);
    const cleanPrice =
      typeof product.price === 'number'
        ? product.price
        : Number((product.price as string).replace(/[^0-9]/g, '')) || 0;

    if (existingItem) {
      this.updateItemQuantity(product.id, existingItem.quantity + 1);
    } else {
      this.cart.update((items) => [...items, { product, quantity: 1, subtotal: cleanPrice }]);
      this.errorMessage.set('');
    }
  }

  updateItemQuantity(productId: string, newQuantity: number): void {
    if (isNaN(newQuantity) || newQuantity < 1) return;

    const currentCart = this.cart();
    const cartItem = currentCart.find((item) => item.product.id === productId);
    if (!cartItem) return;

    if (newQuantity > cartItem.product.stock) {
      this.errorMessage.set(
        `Acción rechazada: Solo quedan ${cartItem.product.stock} unidades disponibles de "${cartItem.product.name}".`,
      );
      return;
    }

    const cleanPrice =
      typeof cartItem.product.price === 'number'
        ? cartItem.product.price
        : Number((cartItem.product.price as string).replace(/[^0-9]/g, '')) || 0;

    this.cart.update((items) =>
      items.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity, subtotal: newQuantity * cleanPrice }
          : item,
      ),
    );
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
    this.cart.update((items) => items.filter((item) => item.product.id !== productId));
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

    // 🚀 ENCIENDE EL OVERLAY DE PORCENTAJE REAL DE B&R SOLUTIONS
    this.loadingService.show('Procesando venta y emitiendo boleta contable...');
    try {
      const apiPaymentMethod = this.selectedPayment() === 'Debito' || this.selectedPayment() === 'Credito'
        ? 'Tarjetas' : (this.selectedPayment() as 'Efectivo' | 'Transferencia');

      const saleId = `POS-${crypto.randomUUID().substring(0, 5).toUpperCase()}`;
      const invoice: SaleInvoice = {
        id: saleId, items: this.cart(), subtotal: this.cartSubtotal(),
        tax: this.cartTax(), total: this.cartTotal(), paymentMethod: apiPaymentMethod,
        createdAt: new Date().toISOString(), operator: this.authService.currentOperatorName(),
        cashClosureId: undefined,
      };

      // 1. Guardar boleta principal
      await this.posRepo.processSale(invoice);

      // 2. Despacho masivo y Kardex en paralelo
      const promesasDeInventario: Promise<void>[] = [];
      for (const item of this.cart()) {
        const nextStock = item.product.stock - item.quantity;
        let nextStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
        if (nextStock <= (item.product.minStock * 0.1)) nextStatus = 'Crítico';
        else if (nextStock < item.product.minStock) nextStatus = 'Bajo';

        promesasDeInventario.push(this.productRepo.updateProduct({
          ...item.product, stock: nextStock, status: nextStatus
        }) as any);

        const automatedMovement: StockMovement = {
          id: `MOV-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
          productName: item.product.name, type: 'Egreso', quantity: -item.quantity,
          reason: `Despacho automático por Venta POS en Boleta de Venta #${saleId}`,
          date: new Date().toISOString().replace('T', ' ').substring(0, 16),
          operator: invoice.operator
        };

        if (typeof (this.stockRepo as any).addMovement === 'function') {
          promesasDeInventario.push((this.stockRepo as any).addMovement(automatedMovement));
        } else if (typeof (this.stockRepo as any).addItem === 'function') {
          promesasDeInventario.push((this.stockRepo as any).addItem(automatedMovement));
        }
      }

      await Promise.all(promesasDeInventario);

      // 🏁 FINALIZA LA LECTURA FLUIDA COMPLETANDO LA BARRA AL 100%
      this.loadingService.hide();
      this.clearCart();
      alert(`¡Venta procesada con éxito! Transacción: ${invoice.id}`);

    } catch (err) {
      this.loadingService.hide(); // Apaga el modal en caso de error de red
      this.errorMessage.set('Error en el servidor central al procesar la venta.');
    }
  }

  formatVisual(value: number | string): string {
    const numValue = typeof value === 'number' ? value : Number(String(value).replace(/[^0-9]/g, '')) || 0;
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(numValue);
  }
}
