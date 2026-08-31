import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [],
  templateUrl: './product-create.html'
})
export class ProductCreate implements OnInit {
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute); // Intercepta parámetros de la URL

  // Signals de Control para los Inputs del Formulario
  readonly name = signal<string>('');
  readonly sku = signal<string>('');
  readonly category = signal<string>('Herramientas eléctricas');
  readonly stock = signal<number>(0);
  readonly minStock = signal<number>(0);
  readonly buyPrice = signal<string>('');
  readonly unitPrice = signal<string>('');

  // Estados de control de la operación dual
  readonly productId = signal<string | null>(null); // Almacena el ID si estamos editando
  readonly errorMessage = signal<string>('');

  // Señal Computada (Computed): Cambia el título y el botón según el modo de operación
  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() => this.isEditMode() ? 'Actualizar Producto' : 'Nuevo Producto');
  readonly pageSubtitle = computed(() => this.isEditMode() ? 'Modifica las existencias o valores comerciales del artículo' : 'Registra un nuevo artículo en el catálogo maestro de B&R Solutions');
  readonly submitButtonText = computed(() => this.isEditMode() ? 'Guardar Cambios' : 'Registrar Artículo');

  ngOnInit(): void {
    // Leemos si la URL contiene el parámetro 'id' (edit/:id)
    const idParam = this.route.snapshot.paramMap.get('id');
    
    if (idParam) {
      this.productId.set(idParam);
      this.loadProductData(idParam);
    }
  }

  private loadProductData(id: string): void {
    // Buscamos el producto en la lista reactiva del repositorio
    const allProducts = this.productService.getProducts()();
    const productToEdit = allProducts.find(p => p.id === id);

    if (productToEdit) {
      // Precargamos todos los inputs con la información actual del producto
      this.name.set(productToEdit.name);
      this.sku.set(productToEdit.sku === 'SIN-SKU' ? '' : productToEdit.sku);
      this.category.set(productToEdit.category);
      this.stock.set(productToEdit.stock);
      this.minStock.set(productToEdit.minStock);
      this.buyPrice.set(productToEdit.buyPrice || '');
      this.unitPrice.set(productToEdit.price.replace('$ ', '')); // Limpiamos el signo para el input
    } else {
      this.errorMessage.set('El producto solicitado no fue encontrado en el inventario actual.');
    }
  }

  // Manejadores de eventos de tipeo manual
  onInputName(e: Event): void { this.name.set((e.target as HTMLInputElement).value); }
  onInputSku(e: Event): void { this.sku.set((e.target as HTMLInputElement).value); }
  onSelectCategory(e: Event): void { this.category.set((e.target as HTMLSelectElement).value); }
  onInputStock(e: Event): void { this.stock.set(Number((e.target as HTMLInputElement).value)); }
  onInputMinStock(e: Event): void { this.minStock.set(Number((e.target as HTMLInputElement).value)); }
  onInputBuyPrice(e: Event): void { this.buyPrice.set((e.target as HTMLInputElement).value); }
  onInputUnitPrice(e: Event): void { this.unitPrice.set((e.target as HTMLInputElement).value); }

  onSubmit(event: Event): void {
    event.preventDefault();

    if (!this.name().trim() || !this.unitPrice().trim() || !this.buyPrice().trim()) {
      this.errorMessage.set('El nombre, el precio de compra y el precio de venta son campos estrictamente obligatorios.');
      return;
    }

    let computedStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
    if (this.stock() === 0) {
      computedStatus = 'Crítico';
    } else if (this.stock() <= this.minStock()) {
      computedStatus = 'Bajo';
    }

    // Construcción del objeto final
    const productPayload: Product = {
      id: this.isEditMode() ? this.productId()! : crypto.randomUUID(), // Reutiliza el ID si edita, crea uno nuevo si es alta
      sku: this.sku().trim() ? this.sku().trim().toUpperCase() : 'SIN-SKU',
      name: this.name().trim(),
      category: this.category(),
      stock: this.stock(),
      minStock: this.minStock(),
      status: computedStatus,
      buyPrice: this.buyPrice(),
      price: this.unitPrice().startsWith('$') ? this.unitPrice().trim() : `$ ${this.unitPrice().trim()}`
    };

    if (this.isEditMode()) {
      // 🚨 MÉTODOS FUTUROS: Aquí invocarás al método .updateProduct(productPayload) de tu service
      // De momento, simulamos la actualización agregándolo o pisando el estado local
      this.productService.addProduct(productPayload); 
    } else {
      this.productService.addProduct(productPayload);
    }
    
    this.router.navigate(['/products']);
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }
}
