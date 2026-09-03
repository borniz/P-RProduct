import { Component, signal, computed, inject, OnInit } from '@angular/core'; // 📌 Importado OnInit
import { STOCK_REPOSITORY } from '../../data-access/stock.repository';
import { StockMovement } from '../../models/stock.model';
import { PRODUCT_REPOSITORY } from '../../../../products/data-access/product.repository';
import { RouterModule } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../../../core/services/auth.service';
import { LoadingService } from '../../../../../core/services/loading.service';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [RouterModule, NgClass],
  templateUrl: './stock-list.html',
})
export class StockList implements OnInit {
  // 📌 Implementada la interfaz OnInit
  private readonly authService = inject(AuthService);
  private readonly stockRepo = inject(STOCK_REPOSITORY);
  private readonly loadingService = inject(LoadingService); // 📌 INYECTADO MOTOR DE PORCENTAJE REAL
  private readonly productRepo = inject(PRODUCT_REPOSITORY);

  // Canales reactivos maestros
  readonly movements = this.stockRepo.getMovements();
  readonly products = this.productRepo.getProducts();

  // Estados de control visual
  readonly filterType = signal<string>('Todos');
  readonly isPanelOpen = signal<boolean>(false);

  // Inputs reactivos para el formulario de movimientos
  readonly selectedProductId = signal<string>('');
  readonly movementType = signal<'Ingreso' | 'Egreso' | 'Ajuste'>('Ingreso');
  readonly quantity = signal<string>('');
  readonly reason = signal<string>('');
  readonly errorMessage = signal<string>('');

  // 🚀 CARGA DE APERTURA: Sincroniza la bitácora con Supabase de forma segura al abrir la vista
  ngOnInit(): void {
    this.syncKardexFromSupabase();
  }

  // 🔄 REFRESCO DE RED: Muestra el overlay global simulando el progreso lineal mientras descarga el Kardex
  async syncKardexFromSupabase(): Promise<void> {
    console.log('🔄 Sincronizando historial de auditoría del Kardex desde Supabase...');
    this.loadingService.show('Descargando historial de auditoría del Kardex...');

    try {
      // Preparamos la cola asíncrona invocando las directivas del repositorio maestro
      const promesas: Promise<void>[] = [];

      if (this.stockRepo && 'loadMovements' in this.stockRepo) {
        promesas.push((this.stockRepo as any).loadMovements());
      } else if (this.stockRepo && 'load' in this.stockRepo) {
        promesas.push((this.stockRepo as any).load());
      }

      if (this.productRepo && 'loadProductsFromSupabase' in this.productRepo) {
        promesas.push((this.productRepo as any).loadProductsFromSupabase());
      }

      if (promesas.length > 0) {
        await Promise.all(promesas);
      }

      // 🏁 Desmontamos el overlay completando la barra al 100% de forma fluida
      this.loadingService.hide();
    } catch (error) {
      console.error('Error al descargar bitácora de stock de internet:', error);
      this.loadingService.hide();
    }
  }

  // 🔍 Filtro computado combinando el tipo de operación (Ingreso/Egreso/Ajuste)
  readonly filteredMovements = computed(() => {
    const type = this.filterType();
    if (type === 'Todos') return this.movements();
    return this.movements().filter((m) => m.type === type);
  });

  // Manejadores de eventos de formulario
  onFilterChange(type: string): void {
    this.filterType.set(type);
  }
  onSelectProduct(e: Event): void {
    this.selectedProductId.set((e.target as HTMLSelectElement).value);
  }
  onSelectType(e: Event): void {
    this.movementType.set((e.target as HTMLSelectElement).value as any);
  }
  onInputReason(e: Event): void {
    this.reason.set((e.target as HTMLInputElement).value);
  }
  onInputQuantity(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/\D/g, ''); // Solo dígitos
    input.value = cleanValue;
    this.quantity.set(cleanValue);
  }

  // 🚀 CONSOLIDACIÓN DE AJUSTE ASÍNCRONO EN CADENA DE SUPABASE
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    const targetProduct = this.products().find((p) => p.id === this.selectedProductId());
    const qty = parseInt(this.quantity(), 10);

    if (!targetProduct || !qty || qty <= 0 || !this.reason().trim()) {
      this.errorMessage.set(
        'Por favor, selecciona un producto válido, una cantidad mayor a cero y justifica el motivo.',
      );
      return;
    }

    // Algoritmo de control de stock: Si es egreso, pasa a valor negativo matemático
    let finalQuantity = qty;
    if (this.movementType() === 'Egreso') {
      finalQuantity = -qty;
    }

    const newMovement: StockMovement = {
      id: `MOV-${crypto.randomUUID().substring(0, 5).toUpperCase()}`,
      productName: targetProduct.name,
      type: this.movementType(),
      quantity: finalQuantity,
      reason: this.reason().trim(),
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      operator: this.authService.currentOperatorName(),
    };

    // ⚡ ENCIENDE EL CANVAS DE CARGA CON PORCENTAJE REAL DE B&R SOLUTIONS
    this.loadingService.show('Inyectando auditoría y reajustando stock en el servidor central...');

    try {
      // 1. Registra el movimiento en el Kardex de Supabase
      await this.stockRepo.registerMovement(newMovement);

      // 2. Cohesión de negocio: Afecta y recalca las alertas de stock en el módulo de productos
      const nextStock = targetProduct.stock + finalQuantity;

      let nextStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
      if (nextStock <= targetProduct.minStock * 0.1) nextStatus = 'Crítico';
      else if (nextStock < targetProduct.minStock) nextStatus = 'Bajo';

      await this.productRepo.updateProduct({
        ...targetProduct,
        stock: nextStock,
        status: nextStatus,
      });

      // 3. Forzamos la recarga limpia para redibujar la grilla al vuelo
      await this.syncKardexFromSupabase();

      this.closePanel();
    } catch (error) {
      this.loadingService.hide();
      this.errorMessage.set(
        'Fallo crítico de red al impactar los esquemas de PostgreSQL en Supabase.',
      );
    }
  }

  openPanel(): void {
    if (this.products().length > 0) this.selectedProductId.set(this.products()[0].id);
    this.isPanelOpen.set(true);
  }

  closePanel(): void {
    this.isPanelOpen.set(false);
    this.quantity.set('');
    this.reason.set('');
    this.errorMessage.set('');
  }
}
