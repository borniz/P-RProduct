import { Injectable, signal, Signal } from '@angular/core';
import { ProductRepository } from './product.repository';
import { Product } from '../models/product.model';
import { ProductDto } from '../models/product.dto';

@Injectable({
  providedIn: 'root'
})
export class SupabaseProductRepository implements ProductRepository {
  // Simulación de respuesta cruda de Supabase (Mesa de pruebas aislada)
  private readonly rawSupabaseData: ProductDto[] = [
    {id:'1', sku_id: 'HER-TL750', product_name: 'Taladro Percutor 750W', category_name: 'Herramientas eléctricas', current_stock: 85, minimum_stock: 15, inventory_status: 'Óptimo',buyPrice:'$15.000', unit_price: '$ 89.900' },
    {id:'2', sku_id: 'FIJ-TR100', product_name: 'Tornillo Para Madera 1" (x100)', category_name: 'Fijaciones', current_stock: 120, minimum_stock: 50, inventory_status: 'Óptimo',buyPrice:'$15.000', unit_price: '$ 2.450' },
    {id:'3', sku_id: 'HER-LLM22', product_name: 'Juego de Llaves Mixtas', category_name: 'Herramientas manuales', current_stock: 22, minimum_stock: 25, inventory_status: 'Bajo',buyPrice:'$15.000', unit_price: '$ 34.900' },
    {id:'4', sku_id: 'ACC-BR008', product_name: 'Broca Concreto 8mm', category_name: 'Accesorios', current_stock: 4, minimum_stock: 20, inventory_status: 'Crítico',buyPrice:'$15.000', unit_price: '$ 1.250' },
    {id:'5', sku_id: 'HER-ES412', product_name: 'Esmeril Angular 4 1/2"', category_name: 'Herramientas eléctricas', current_stock: 40, minimum_stock: 10, inventory_status: 'Óptimo',buyPrice:'$15.000', unit_price: '$ 45.900' },
    {id:'6', sku_id: 'SEG-GA002', product_name: 'Gafas de Seguridad Transparentes', category_name: 'Protección personal', current_stock: 15, minimum_stock: 30, inventory_status: 'Bajo',buyPrice:'$15.000', unit_price: '$ 5.900' },
    {id:'7', sku_id: 'PIN-LT001', product_name: 'Pintura Látex Blanca 1 Galón', category_name: 'Pinturas', current_stock: 2, minimum_stock: 8, inventory_status: 'Crítico',buyPrice:'$15.000', unit_price: '$ 18.500' }
  ];

  // Instanciamos el Signal transformando los registros mediante el mapeador de la arquitectura
  private readonly _products = signal<Product[]>(
    this.rawSupabaseData.map(dto => this.mapToDomain(dto))
  );

  getProducts(): Signal<Product[]> {
    return this._products.asReadonly();
  }

  addProduct(product: Product): void {
    this._products.update(current => [product, ...current]);
  }

  // Mapper: Aísla la interfaz de las variaciones de nombres de columnas del backend
  private mapToDomain(dto: ProductDto): Product {
    return {
      id:dto.id,
      sku: dto.sku_id,
      name: dto.product_name,
      category: dto.category_name,
      stock: dto.current_stock,
      minStock: dto.minimum_stock,
      status: dto.inventory_status,
      buyPrice:dto.buyPrice,
      price: dto.unit_price
    };
  }
}
