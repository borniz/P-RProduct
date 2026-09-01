import { Injectable, signal, Signal, inject } from '@angular/core';
import { ProductRepository } from './product.repository';
import { Product } from '../models/product.model';
import { ProductDto } from '../models/product.dto';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseProductRepository implements ProductRepository {
  // Inyectamos la conexión global de Supabase
  private readonly supabase = inject(SupabaseService).client;

  // Estado reactivo maestro en memoria (Inicia vacío hasta que responda la red)
  private readonly _products = signal<Product[]>([]);

  constructor() {
    // Disparamos la carga inicial de datos de forma automática al instanciar el ERP
    this.loadProductsFromSupabase();
  }

  getProducts(): Signal<Product[]> {
    return this._products.asReadonly();
  }

  // 📥 READ: Consulta real a la tabla 'products' de Supabase
  async loadProductsFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('products') // Nombre exacto de tu tabla en Supabase
        .select('*')
        .order('id', { ascending: false });

      if (error) throw error;

      if (data) {
        // Mapeamos los DTOs de Postgres a las entidades del Dominio y actualizamos el Signal
        const mappedProducts = (data as ProductDto[]).map(dto => this.mapToDomain(dto));
        this._products.set(mappedProducts);
      }
    } catch (err) {
      console.error('Error crítico al leer inventario desde Supabase:', err);
    }
  }

  // 📤 CREATE: Inserción real en Supabase
  async addProduct(product: Product): Promise<void> {
    try {
      // Convertimos el modelo de la UI al formato DTO (snake_case) que exige Postgres
      const dtoPayload = this.mapToDto(product);

      const { error } = await this.supabase
        .from('products')
        .insert([dtoPayload]);

      if (error) throw error;

      // Optimistic UI Update: Refrescamos la lista local de inmediato para máxima velocidad visual
      this._products.update(current => [product, ...current]);
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
        .eq('id', product.id); // Cláusula WHERE de SQL estricta

      if (error) throw error;

      // Actualizamos la fila en el Signal local en milisegundos
      this._products.update(current => 
        current.map(p => p.id === product.id ? product : p)
      );
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
