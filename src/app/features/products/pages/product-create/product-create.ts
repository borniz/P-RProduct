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
  private readonly route = inject(ActivatedRoute);

  // Signals de Control para los Inputs
  readonly name = signal<string>('');
  readonly sku = signal<string>('');
  readonly category = signal<string>('Herramientas eléctricas');
  readonly stock = signal<string>('0');
  readonly minStock = signal<string>('0');
  readonly buyPrice = signal<string>('');
  readonly unitPrice = signal<string>('');
  
  // 📸 SIGNALS REEL PARA IMÁGENES
  readonly imagePreview = signal<string | null>(null);

  readonly productId = signal<string | null>(null);
  readonly errorMessage = signal<string>('');

  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() => this.isEditMode() ? 'Actualizar Producto' : 'Nuevo Producto');
  readonly pageSubtitle = computed(() => this.isEditMode() ? 'Modifica las existencias o valores comerciales del artículo' : 'Registra un nuevo artículo en el catálogo maestro de B&R Solutions');
  readonly submitButtonText = computed(() => this.isEditMode() ? 'Guardar Cambios' : 'Registrar Artículo');

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.productId.set(idParam);
      this.loadProductData(idParam);
    }
  }

  private loadProductData(id: string): void {
    const allProducts = this.productService.getProducts()();
    const productToEdit = allProducts.find(p => p.id === id);

    if (productToEdit) {
      this.name.set(productToEdit.name);
      this.sku.set(productToEdit.sku === 'SIN-SKU' ? '' : productToEdit.sku);
      this.category.set(productToEdit.category);
      this.stock.set(String(productToEdit.stock || 0).replace(/\D/g, ''));
      this.minStock.set(String(productToEdit.minStock || 0).replace(/\D/g, ''));
      this.buyPrice.set((productToEdit.buyPrice || '').replace(/\D/g, ''));
      this.unitPrice.set((productToEdit.price || '').replace(/\D/g, ''));
      
      // Si el producto ya tiene imagen asignada, la cargamos en la previsualización
      if (productToEdit.imageUrl) {
        this.imagePreview.set(productToEdit.imageUrl);
      }
    } else {
      this.errorMessage.set('El producto solicitado no fue encontrado en el inventario actual.');
    }
  }

  // 📸 PROCESADOR REACTIVO DE ARCHIVOS (IMÁGENES)
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    // Validación de seguridad para asegurar que sea estrictamente una imagen
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('El archivo seleccionado debe ser una imagen válida (PNG, JPG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      // Guardamos la imagen procesada en formato Base64 para previsualización inmediata
      this.imagePreview.set(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  // Quitar la imagen seleccionada
  removeImage(): void {
    this.imagePreview.set(null);
  }

  // --- MÉTODOS GENÉRICOS DE FORMATEO Y PROCESAMIENTO ---
  formatVisual(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const cleanValue = value.toString().replace(/\D/g, '');
    if (!cleanValue) return '';
    return new Intl.NumberFormat('es-CO').format(parseInt(cleanValue, 10));
  }

  private handleNumericInput(event: Event, signalTarget: any): void {
    const input = event.target as HTMLInputElement;
    const rawValue = input.value.replace(/\D/g, '');
    signalTarget.set(rawValue);
    input.value = this.formatVisual(rawValue);
  }

  onInputName(e: Event): void { this.name.set((e.target as HTMLInputElement).value); }
  onInputSku(e: Event): void { this.sku.set((e.target as HTMLInputElement).value); }
  onSelectCategory(e: Event): void { this.category.set((e.target as HTMLSelectElement).value); }
  onInputStock(e: Event): void { this.handleNumericInput(e, this.stock); }
  onInputMinStock(e: Event): void { this.handleNumericInput(e, this.minStock); }
  onInputBuyPrice(e: Event): void { this.handleNumericInput(e, this.buyPrice); }
  onInputUnitPrice(e: Event): void { this.handleNumericInput(e, this.unitPrice); }

  onSubmit(event: Event): void {
    event.preventDefault();

    if (!this.name().trim() || !this.unitPrice().trim() || !this.buyPrice().trim()) {
      this.errorMessage.set('El nombre, el precio de compra y el precio de venta son campos estrictamente obligatorios.');
      return;
    }

    const numericStock = this.stock() ? parseInt(this.stock(), 10) : 0;
    const numericMinStock = this.minStock() ? parseInt(this.minStock(), 10) : 0;

    let computedStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
    if (numericStock === 0) {
      computedStatus = 'Crítico';
    } else if (numericStock <= numericMinStock) {
      computedStatus = 'Bajo';
    }

    const productPayload: Product = {
      id: this.isEditMode() ? this.productId()! : crypto.randomUUID(),
      sku: this.sku().trim() ? this.sku().trim().toUpperCase() : 'SIN-SKU',
      name: this.name().trim(),
      category: this.category(),
      stock: numericStock,       
      minStock: numericMinStock, 
      status: computedStatus,
      buyPrice: this.buyPrice(),
      price: this.unitPrice().startsWith('$') ? this.unitPrice().trim() : `$ ${this.unitPrice().trim()}`,
      imageUrl: this.imagePreview() || undefined // Inyección elástica de la imagen o undefined si no hay
    };

    if (this.isEditMode()) {
      this.productService.updateProduct(productPayload);
    } else {
      this.productService.addProduct(productPayload);
    }

    this.router.navigate(['/products']);
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }
}
