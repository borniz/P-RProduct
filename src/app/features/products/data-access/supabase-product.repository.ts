import { Injectable, signal, Signal, inject, NgZone } from '@angular/core'; // 📌 CORREGIDO: Importado NgZone
import { ProductRepository } from './product.repository';
import { Product } from '../models/product.model';
import { ProductDto } from '../models/product.dto';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseProductRepository implements ProductRepository {
  // Inyectamos la conexión global de Supabase y el controlador de zonas reactivas
  private readonly supabase = inject(SupabaseService).client;
  private readonly zone = inject(NgZone); // 📌 Inyectado para asegurar la reactividad

  // Estado reactivo maestro en memoria
  private readonly _products = signal<Product[]>([]);

  constructor() {
    // 1. Disparamos la carga inicial de datos al instanciar el ERP
    this.loadProductsFromSupabase();

    // 2. 🚀 SUSCRIPCIÓN EN TIEMPO REAL MULTI-EVENTO (INSERT y UPDATE)
    // Sintoniza cualquier cambio físico en la tabla 'products'
    setTimeout(() => {
      this.supabase
        .channel('cambios-productos-realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'products' }, // Escucha todo tipo de mutación (*)
          (payload) => {
            // Obligamos a Angular a capturar la alerta dentro de su ciclo de control nativo
            this.zone.run(() => {
              
              // Convertimos el payload crudo de Postgres a nuestra entidad limpia
              const incomingProduct = this.mapToDomain(payload.new as ProductDto);

              if (payload.eventType === 'INSERT') {
                this._products.update(current => {
                  if (current.some(p => p.id === incomingProduct.id)) return current;
                  return [incomingProduct, ...current];
                });
              } 
              
              else if (payload.eventType === 'UPDATE') {
                // Sincroniza stocks alterados por otras cajas rompiendo la referencia de memoria
                this._products.update(current => 
                  current.map(p => p.id === incomingProduct.id ? incomingProduct : p)
                );
              }
            });
          }
        )
        .subscribe();
    }, 0);
  }

  async load(): Promise<void> {
    await this.loadProductsFromSupabase();
  }

  getProducts(): Signal<Product[]> {
    return this._products.asReadonly();
  }

  // 📥 READ: Consulta real a la tabla 'products' de Supabase
  async loadProductsFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('products') 
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedProducts = (data as ProductDto[]).map(dto => this.mapToDomain(dto));
        // 🚀 CLONACIÓN EN MEMORIA: Asegura que el POS y Catálogo destruyan la caché vieja
        this._products.set([...mappedProducts]);
      }
    } catch (err) {
      console.error('Error crítico al leer inventario desde Supabase:', err);
    }
  }

  // 📤 CREATE: Inserción real en Supabase
  async addProduct(product: Product): Promise<void> {
    try {
      const dtoPayload = this.mapToDto(product);

      const { error } = await this.supabase
        .from('products')
        .insert([dtoPayload]);

      if (error) throw error;
      
      // La actualización en el constructor manejará la sincronización limpia
    } catch (err) {
      console.error('Error al insertar producto en Supabase:', err);
    }
  }

  // 🔄 UPDATE: Modificación real por ID en Supabase
  async updateProduct(product: Product): Promise<void> {
    try {
      const dtoPayload = this.mapToDto(product);

      const { error } = await this.supabase
        .from('products')
        .update(dtoPayload)
        .eq('id', product.id); 

      if (error) throw error;

      // La actualización en el constructor manejará la sincronización limpia
    } catch (err) {
      console.error('Error al actualizar producto en Supabase:', err);
    }
  }

  // 📝 MAPPERS PROFESIONALES DE DESACOPLAMIENTO
  private mapToDomain(dto: ProductDto): Product {
    return {
      id: dto.id,
      sku: dto.sku_id || 'SIN-SKU',
      name: dto.product_name,
      category: dto.category_name,
      brand: dto.brand_name || 'Sin Marca',
      unit: dto.unit_name || 'Unidad',
      supplier: dto.supplier_name || 'Sin Proveedor',
      stock: dto.current_stock,
      minStock: dto.minimum_stock,
      status: dto.inventory_status,
      buyprice: dto.buyprice,
      price: dto.unit_price,
      imageurl: dto.imageurl
    };
  }

  private mapToDto(model: Product): Partial<ProductDto> {
    return {
      id: model.id,
      sku_id: model.sku === 'SIN-SKU' ? null : model.sku,
      product_name: model.name,
      category_name: model.category,
      brand_name: model.brand,
      unit_name: model.unit,
      supplier_name: model.supplier,
      current_stock: model.stock,
      minimum_stock: model.minStock,
      inventory_status: model.status,
      buyprice: model.buyprice,
      unit_price: model.price,
      imageurl: model.imageurl
    };
  }
}
