import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { CATEGORY_REPOSITORY } from '../../../inventory/categories/data-access/category.repository';
import { UNIT_REPOSITORY } from '../../../inventory/units/data-access/unit.repository';
import { BRAND_REPOSITORY } from '../../../inventory/brands/data-access/brands.repository';
import { Product } from '../../models/product.model';
import { BarcodeFormat } from '@zxing/library';

// 📌 IMPORTACIONES ARQUITECTÓNICAS GENÉRICAS
import {
  GenericInventoryItem,
  ModuleMetadata,
} from '../../../inventory/shared/models/generic-inventory.model';
import { GenericFormModalComponent } from '../../../inventory/shared/components/generic-form-modal/generic-form-modal';
import { SUPPLIER_REPOSITORY } from '../../../suppliers/data-access/supplier.repository';
import { ZXingScannerModule } from '@zxing/ngx-scanner';

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [GenericFormModalComponent, ZXingScannerModule],
  templateUrl: './product-create.html',
})
export class ProductCreate implements OnInit {
  private readonly productService = inject(PRODUCT_REPOSITORY);
  private readonly categoryService = inject(CATEGORY_REPOSITORY);
  private readonly brandService = inject(BRAND_REPOSITORY);
  private readonly unitService = inject(UNIT_REPOSITORY);
  private readonly supplierService = inject(SUPPLIER_REPOSITORY);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  // Controladores locales de hardware óptico
  readonly isScannerActive = signal<boolean>(false);
  readonly productId = signal<string | null>(null);
  readonly errorMessage = signal<string>('');

  // Signals de Control para los Inputs del Formulario
  readonly name = signal<string>('');
  readonly sku = signal<string>('');
  readonly category = signal<string>('');
  readonly brand = signal<string>('');
  readonly unit = signal<string>('');
  readonly supplier = signal<string>('');
  readonly stock = signal<string>('0');
  readonly minStock = signal<string>('0');
  readonly buyPrice = signal<string>('');
  readonly unitPrice = signal<string>('');
  readonly imagePreview = signal<string | null>(null);

  // Controladores reactivos de modales flotantes en cascada
  readonly isCategoryModalOpen = signal<boolean>(false);
  readonly isBrandModalOpen = signal<boolean>(false);
  readonly isUnitModalOpen = signal<boolean>(false);
  readonly isSupplierModalOpen = signal<boolean>(false);

  // Colecciones de datos vivas de Supabase
  readonly categoriesList = this.categoryService.getCategories();
  readonly brandsList = this.brandService.getBrands();
  readonly unitsList = this.unitService.getUnits();
  readonly suppliersList = this.supplierService.getSuppliers();

  // Metadatos semánticos de configuración polimórfica
  readonly categoryMetadata: ModuleMetadata = {
    entityName: 'Categoría', pluralName: 'Categorías', subtitle: 'Parámetro rápido',
    metricLabel: '', hasDescription: true, descriptionPlaceholder: 'Alcance...'
  };
  readonly brandMetadata: ModuleMetadata = {
    entityName: 'Marca', pluralName: 'Marcas', subtitle: 'Parámetro rápido',
    metricLabel: '', hasDescription: true, descriptionPlaceholder: 'Detalles...'
  };
  readonly unitMetadata: ModuleMetadata = {
    entityName: 'Unidad', pluralName: 'Unidades', subtitle: 'Parámetro rápido',
    metricLabel: '', hasDescription: false, descriptionPlaceholder: ''
  };
  readonly supplierMetadata: ModuleMetadata = {
    entityName: 'Proveedor', pluralName: 'Proveedores', subtitle: 'Parámetro rápido',
    metricLabel: '', hasDescription: true, descriptionPlaceholder: 'Ej: Contacto corporativo, fletes o condiciones...'
  };

  readonly allowedFormats = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.CODE_128];

  readonly isEditMode = computed(() => this.productId() !== null);
  readonly pageTitle = computed(() => this.isEditMode() ? 'Actualizar Producto' : 'Nuevo Producto');
  readonly pageSubtitle = computed(() => this.isEditMode() 
    ? 'Modifica las existencias o valores comerciales del artículo' 
    : 'Registra un nuevo artículo en el catálogo maestro de B&R Solutions'
  );
  readonly submitButtonText = computed(() => this.isEditMode() ? 'Guardar Cambios' : 'Registrar Artículo');

  ngOnInit(): void {
    if (this.categoriesList().length > 0) this.category.set(this.categoriesList()[0].name);
    if (this.brandsList().length > 0) this.brand.set(this.brandsList()[0].name);
    if (this.unitsList().length > 0) this.unit.set(this.unitsList()[0].name);
    if (this.suppliersList().length > 0) this.supplier.set(this.suppliersList()[0].name);
    
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.productId.set(idParam);
      this.loadProductData(idParam);
    }
  }
  toggleCameraScanner(): void {
    this.isScannerActive.update(current => !current);
  }

  onBarcodeScanSuccess(scannedCode: any): void {
    const codeString = String(scannedCode || '').trim().toUpperCase();
    if (!codeString) return;

    this.sku.set(codeString); 
    this.isScannerActive.set(false);
    this.playScanBeep();
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
      console.log('Audio no soportado');
    }
  }

  private loadProductData(id: string): void {
    const allProducts = this.productService.getProducts()();
    const productToEdit = allProducts.find((p) => p.id === id);

    if (productToEdit) {
      this.name.set(productToEdit.name);
      this.sku.set(productToEdit.sku === 'SIN-SKU' ? '' : productToEdit.sku);
      this.category.set(productToEdit.category);
      if (productToEdit.brand) this.brand.set(productToEdit.brand);
      if (productToEdit.unit) this.unit.set(productToEdit.unit);
      this.stock.set(String(productToEdit.stock || 0).replace(/\D/g, ''));
      this.minStock.set(String(productToEdit.minStock || 0).replace(/\D/g, ''));
      this.buyPrice.set((productToEdit.buyprice || '').replace(/\D/g, ''));
      this.unitPrice.set((productToEdit.price || '').replace(/\D/g, ''));
      if (productToEdit.supplier) this.supplier.set(productToEdit.supplier);
      if (productToEdit.imageurl) this.imagePreview.set(productToEdit.imageurl);
    } else {
      this.errorMessage.set('El producto solicitado no fue encontrado en el inventario actual.');
    }
  }

  onSelectCategory(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'categoryCreate') this.isCategoryModalOpen.set(true);
    else this.category.set(val);
  }

  onSelectBrand(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'brandCreate') this.isBrandModalOpen.set(true);
    else this.brand.set(val);
  }

  onSelectUnit(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'unitCreate') this.isUnitModalOpen.set(true);
    else this.unit.set(val);
  }

  onSelectSupplier(e: Event): void {
    const val = (e.target as HTMLSelectElement).value;
    if (val === 'supplierCreate') this.isSupplierModalOpen.set(true);
    else this.supplier.set(val);
  }

  onCategoryCreated(item: GenericInventoryItem): void {
    this.categoryService.addCategory(item);
    this.category.set(item.name);
    this.isCategoryModalOpen.set(false);
  }

  onBrandCreated(item: GenericInventoryItem): void {
    this.brandService.addBrand(item);
    this.brand.set(item.name);
    this.isBrandModalOpen.set(false);
  }

  onUnitCreated(item: GenericInventoryItem): void {
    this.unitService.addUnit(item);
    this.unit.set(item.name);
    this.isUnitModalOpen.set(false);
  }

  onSupplierCreated(item: GenericInventoryItem): void {
    this.supplierService.addSuppliers(item);
    this.supplier.set(item.name);
    this.isSupplierModalOpen.set(false);
  }

  onInputName(e: Event): void { this.name.set((e.target as HTMLInputElement).value); }
  onInputSku(e: Event): void { this.sku.set((e.target as HTMLInputElement).value); }
  onInputStock(e: Event): void { this.handleNumericInput(e, this.stock); }
  onInputMinStock(e: Event): void { this.handleNumericInput(e, this.minStock); }
  onInputBuyPrice(e: Event): void { this.handleNumericInput(e, this.buyPrice); }
  onInputUnitPrice(e: Event): void { this.handleNumericInput(e, this.unitPrice); }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('El archivo seleccionado debe ser una imagen válida.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  removeImage(): void { this.imagePreview.set(null); }

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

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.name().trim() || !this.unitPrice().trim() || !this.buyPrice().trim()) {
      this.errorMessage.set('Campos obligatorios incompletos.');
      return;
    }

    const numericStock = this.stock() ? parseInt(this.stock(), 10) : 0;
    const numericMinStock = this.minStock() ? parseInt(this.minStock(), 10) : 0;

    let computedStatus: 'Óptimo' | 'Bajo' | 'Crítico' = 'Óptimo';
    const criticalThreshold = numericMinStock * 0.1;

    if (numericStock <= criticalThreshold) computedStatus = 'Crítico';
    else if (numericStock < numericMinStock) computedStatus = 'Bajo';

    const productPayload: Product = {
      id: this.isEditMode() ? this.productId()! : crypto.randomUUID(),
      sku: this.sku().trim() ? this.sku().trim().toUpperCase() : 'SIN-SKU',
      name: this.name().trim(),
      category: this.category(),
      brand: this.brand(),
      unit: this.unit(),
      supplier: this.supplier(),
      stock: numericStock,
      minStock: numericMinStock,
      status: computedStatus,
      buyprice: this.buyPrice(),
      price: this.unitPrice().startsWith('$') ? this.unitPrice().trim() : `$ ${this.unitPrice().trim()}`,
      imageurl: this.imagePreview() || undefined,
    };

    try {
      if (this.isEditMode()) {
        this.productService.updateProduct(productPayload);
      } else {
        this.productService.addProduct(productPayload);
      }
      this.router.navigate(['/products']);
    } catch (error) {
      this.errorMessage.set('No se pudieron guardar los cambios en el servidor central.');
    }
  }

  cancel(): void {
    this.router.navigate(['/products']);
  }
}
