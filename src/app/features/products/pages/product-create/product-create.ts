import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { CATEGORY_REPOSITORY } from '../../../inventory/categories/data-access/category.repository';
import { UNIT_REPOSITORY } from '../../../inventory/units/data-access/unit.repository';
import { Product } from '../../models/product.model';
import { BRAND_REPOSITORY } from '../../../inventory/brands/data-access/brands.repository';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [], // Control flow nativo de Angular v22
  templateUrl: './product-create.html'
})
export class ProductCreate implements OnInit {
  // Inyecciones funcionales de dependencias de la arquitectura B&R Solutions
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly categoryService = inject(CATEGORY_REPOSITORY);
  private readonly brandService = inject(BRAND_REPOSITORY);
  private readonly unitService = inject(UNIT_REPOSITORY);
  
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Signals de Control para los Inputs del Formulario
  readonly name = signal<string>('');
  readonly sku = signal<string>('');
  readonly category = signal<string>(''); // Inician vacíos para forzar selección
  readonly brand = signal<string>('');    // NUEVA OPCIÓN VIVA
  readonly unit = signal<string>('');     // NUEVA OPCIÓN VIVA
  readonly stock = signal<string>('0');
  readonly minStock = signal<string>('0');
  readonly buyPrice = signal<string>('');
  readonly unitPrice = signal<string>('');
  readonly imagePreview = signal<string | null>(null);

  // Estados de control de la operación dual
  readonly productId = signal<string | null>(null);
  readonly errorMessage = signal<string>('');

  // 📌 LISTAS REACTIVAS EXPUESTAS DESDE LOS REPOSITORIOS GENÉRICOS
  readonly categoriesList = this.categoryService.getCategories();
  readonly brandsList = this.brandService.getBrands();
  readonly unitsList = this.unitService.getUnits();

  // Señales Computadas Duales
  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() => this.isEditMode() ? 'Actualizar Producto' : 'Nuevo Producto');
  readonly pageSubtitle = computed(() => this.isEditMode() ? 'Modifica las existencias o valores comerciales del artículo' : 'Registra un nuevo artículo en el catálogo maestro de B&R Solutions');
  readonly submitButtonText = computed(() => this.isEditMode() ? 'Guardar Cambios' : 'Registrar Artículo');

  ngOnInit(): void {
    // Inicialización por defecto con el primer elemento de las listas si existen
    if (this.categoriesList().length > 0) this.category.set(this.categoriesList()[0].name);
    if (this.brandsList().length > 0) this.brand.set(this.brandsList()[0].name);
    if (this.unitsList().length > 0) this.unit.set(this.unitsList()[0].name);

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
      
      // Intentamos precargar campos extendidos si ya existen en el dominio, si no, quedan por defecto
      if (productToEdit.brand) this.brand.set(productToEdit.brand);
      if (productToEdit.unit) this.unit.set(productToEdit.unit);

      this.stock.set(String(productToEdit.stock || 0).replace(/\D/g, ''));
      this.minStock.set(String(productToEdit.minStock || 0).replace(/\D/g, ''));
      this.buyPrice.set((productToEdit.buyPrice || '').replace(/\D/g, ''));
      this.unitPrice.set((productToEdit.price || '').replace(/\D/g, ''));
      if (productToEdit.imageUrl) this.imagePreview.set(productToEdit.imageUrl);
    } else {
      this.errorMessage.set('El producto solicitado no fue encontrado en el inventario actual.');
    }
  }

  // --- MANEJADORES DE EVENTOS DE SELECCIÓN Y TEXTO ---
  onInputName(e: Event): void { this.name.set((e.target as HTMLInputElement).value); }
  onInputSku(e: Event): void { this.sku.set((e.target as HTMLInputElement).value); }
  
  onSelectCategory(e: Event): void {
     this.category.set((e.target as HTMLSelectElement).value); 
     if(this.category()==='categoryCreate'){
      this.router.navigate(['/inventory/categories']);
     }
    }
  onSelectBrand(e: Event): void {
     this.brand.set((e.target as HTMLSelectElement).value); 
     if(this.brand()==='brandCreate'){
      this.router.navigate(["/inventory/brands"])
     }
    }
  onSelectUnit(e: Event): void {
     this.unit.set((e.target as HTMLSelectElement).value); 
     if(this.unit()==='unitCreate'){
      this.router.navigate(["/inventory/units"])
     }
    }

  onInputStock(e: Event): void { this.handleNumericInput(e, this.stock); }
  onInputMinStock(e: Event): void { this.handleNumericInput(e, this.minStock); }
  onInputBuyPrice(e: Event): void { this.handleNumericInput(e, this.buyPrice); }
  onInputUnitPrice(e: Event): void { this.handleNumericInput(e, this.unitPrice); }

  // --- PROCESADOR DE IMÁGENES ---
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('El archivo seleccionado debe ser una imagen válida (PNG, JPG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeImage(): void { this.imagePreview.set(null); }

  // --- MÉTODOS GENÉRICOS DE FORMATEO ---
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

  onSubmit(event: Event): void {
    event.preventDefault();

    if (!this.name().trim() || !this.unitPrice().trim() || !this.buyPrice().trim()) {
      this.errorMessage.set('El nombre, el precio de compra y el precio de venta son campos obligatorios.');
      return;
    }

    const numericStock = this.stock() ? parseInt(this.stock(), 10) : 0;
    const numericMinStock = this.minStock() ? parseInt(this.minStock(), 10) : 0;

    let computedStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
    if (numericStock === 0) computedStatus = 'Crítico';
    else if (numericStock <= numericMinStock) computedStatus = 'Bajo';

    const productPayload: Product = {
      id: this.isEditMode() ? this.productId()! : crypto.randomUUID(),
      sku: this.sku().trim() ? this.sku().trim().toUpperCase() : 'SIN-SKU',
      name: this.name().trim(),
      category: this.category(),
      brand: this.brand(), // Almacenamiento elástico de la marca
      unit: this.unit(),   // Almacenamiento elástico de la unidad
      stock: numericStock,       
      minStock: numericMinStock, 
      status: computedStatus,
      buyPrice: this.buyPrice(),
      price: this.unitPrice().startsWith('$') ? this.unitPrice().trim() : `$ ${this.unitPrice().trim()}`,
      imageUrl: this.imagePreview() || undefined
    };

    if (this.isEditMode()) {
      this.productService.updateProduct(productPayload);
    } else {
      this.productService.addProduct(productPayload);
    }

    this.router.navigate(['/products']);
  }

  cancel(): void { this.router.navigate(['/products']); }
}
