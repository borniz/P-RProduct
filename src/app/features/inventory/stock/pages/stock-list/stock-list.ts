import { Component, signal, computed, inject } from '@angular/core';
import { STOCK_REPOSITORY } from '../../data-access/stock.repository';
import { StockMovement } from '../../models/stock.model';
import { PRODUCT_REPOSITORY } from '../../../../products/data-access/product.repository';
import { RouterModule } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-stock-list',
  standalone: true,
  imports: [RouterModule,NgClass], 
  templateUrl: './stock-list.html'
})
export class StockList {
  private readonly stockRepo = inject(STOCK_REPOSITORY);
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

  // Filtro computado combinando el tipo de operación (Ingreso/Egreso/Ajuste)
  readonly filteredMovements = computed(() => {
    const type = this.filterType();
    if (type === 'Todos') return this.movements();
    return this.movements().filter(m => m.type === type);
  });

  // Manejadores de eventos de formulario
  onFilterChange(type: string): void { this.filterType.set(type); }
  onSelectProduct(e: Event): void { this.selectedProductId.set((e.target as HTMLSelectElement).value); }
  onSelectType(e: Event): void { this.movementType.set((e.target as HTMLSelectElement).value as any); }
  onInputReason(e: Event): void { this.reason.set((e.target as HTMLInputElement).value); }

  onInputQuantity(event: Event): void {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.replace(/\D/g, ''); // Solo dígitos
    input.value = cleanValue;
    this.quantity.set(cleanValue);
  }

  onSubmit(event: Event): void {
    event.preventDefault();

    const targetProduct = this.products().find(p => p.id === this.selectedProductId());
    const qty = parseInt(this.quantity(), 10);

    if (!targetProduct || !qty || qty <= 0 || !this.reason().trim()) {
      this.errorMessage.set('Por favor, selecciona un producto válido, una cantidad mayor a cero y justifica el motivo.');
      return;
    }

    // Algoritmo de control de stock: Si es egreso o ajuste negativo, se procesa matemáticamente
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
      operator: 'Yarod Bonilla' // se cambia de acuerdo al usuario
    };

    // 📌 ACTUALIZACIÓN EN CASCADA: Registra el movimiento en el Kardex
    this.stockRepo.registerMovement(newMovement);

    // 📌 COHESIÓN DE NEGOCIO: Afecta directamente el stock real en el módulo de productos
    const updatedProduct = {
      ...targetProduct,
      stock: targetProduct.stock + finalQuantity
    };
    this.productRepo.updateProduct(updatedProduct);

    this.closePanel();
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
