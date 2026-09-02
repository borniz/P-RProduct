import { Injectable, signal, Signal, inject, NgZone } from '@angular/core'; 
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
  private readonly zone = inject(NgZone); 

  // Estado reactivo maestro en memoria
  private readonly _products = signal<Product[]>([]);
  
  // Instancia de control interno para el ciclo de vida del canal de transmisión
  private realtimeChannel: any = null;
  
  // 🚀 LA BANDERA DE CONTROL DEFINITIVA:
  // Evita de forma matemática que múltiples componentes (como en el Dashboard) 
  // intenten abrir canales en paralelo durante el arranque de la app.
  private isRealtimeInitialized = false;

  constructor() {
    // 1. Disparamos la carga inicial de datos desde la base de datos central
    this.loadProductsFromSupabase();

    // 2. 🚀 INICIALIZACIÓN BLINDADA: Evita el choque de callbacks al refrescar o cargar el Dashboard
    this.initRealtimeConnection();
  }

  private initRealtimeConnection(): void {

  if (this.isRealtimeInitialized) {
    return;
  }

  try {


    // ============================================================
    // BUSCAR CANALES EXISTENTES
    // ============================================================

    const existingChannels =
      this.supabase.getChannels();


    existingChannels
      .filter(channel =>
        channel.topic === 'realtime:products-realtime'
      )
      .forEach(channel => {


        this.supabase.removeChannel(channel);
      });


    // ============================================================
    // CREAR NUEVO CANAL
    // ============================================================

    const channel =
      this.supabase.channel('products-realtime');


    // ============================================================
    // REGISTRAR POSTGRES CHANGES
    // ============================================================

    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products'
      },
      (payload: any) => {

        this.zone.run(() => {



          // ======================================================
          // DELETE
          // ======================================================

          if (payload.eventType === 'DELETE') {

            const deletedId = payload.old?.id;

            if (!deletedId) {

              console.warn(
                '⚠️ [Realtime] DELETE sin ID',
                payload
              );

              return;
            }

            this._products.update(products =>
              products.filter(
                product => product.id !== deletedId
              )
            );

            return;
          }


          // ======================================================
          // INSERT
          // ======================================================

          if (payload.eventType === 'INSERT') {

            const product =
              this.mapToDomain(payload.new);

            this._products.update(products => {

              const exists =
                products.some(
                  p => p.id === product.id
                );

              if (exists) {
                return products;
              }

              return [
                product,
                ...products
              ];
            });


            return;
          }


          // ======================================================
          // UPDATE
          // ======================================================

          if (payload.eventType === 'UPDATE') {

            const product =
              this.mapToDomain(payload.new);

            this._products.update(products => {

              const updated =
                products.map(existing =>
                  existing.id === product.id
                    ? product
                    : existing
                );

              return [...updated];
            });

          }

        });
      });


    // ============================================================
    // GUARDAR REFERENCIA
    // ============================================================

    this.realtimeChannel = channel;


    // ============================================================
    // SUSCRIBIR
    // ============================================================

    channel.subscribe(
      (status, error) => {



        if (status === 'SUBSCRIBED') {

          this.isRealtimeInitialized = true;


          return;
        }


        if (status === 'CHANNEL_ERROR') {

          console.error(
            '❌ [Realtime] CHANNEL_ERROR:',
            error
          );

          this.isRealtimeInitialized = false;

          return;
        }


        if (status === 'TIMED_OUT') {

          console.error(
            '⏱️ [Realtime] TIMED_OUT'
          );

          this.isRealtimeInitialized = false;

          return;
        }


        if (status === 'CLOSED') {

          console.warn(
            '🔴 [Realtime] Canal cerrado'
          );

          this.isRealtimeInitialized = false;
        }

      }
    );

  } catch (error) {

    this.isRealtimeInitialized = false;

    console.error(
      '❌ [Realtime] Error al inicializar:',
      error
    );
  }
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
        const mappedProducts = (data as any[]).map(dto => this.mapToDomain(dto));
        // 🚀 CLONACIÓN EN MEMORIA: Asegura que el POS y Catálogo destruyan la caché vieja
        this._products.set([...mappedProducts]);
      }
    } catch (err) {
      console.error('Error crítico al leer inventario desde Supabase:', err);
    }
  }

  // 🚀 CONSULTA REMOTA AUXILIAR POR ID (Para romper la caché en los formularios)
  async getProductByIdFromServer(id: string): Promise<Product | null> {
    try {
      const { data, error } = await this.supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data ? this.mapToDomain(data) : null;
    } catch (err) {
      console.error('Error al recuperar producto por ID:', err);
      return null;
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
      await this.loadProductsFromSupabase();
    } catch (err) {
      console.error('Error al insertar producto en Supabase:', err);
    }
  }

  // 🔄 UPDATE: Modificación real por ID en Supabase
  async updateProduct(product: Product): Promise<void> {
    try {
      const dtoPayload = this.mapToDto(product);

      // 1. Guarda los cambios reales en Supabase
      const { error } = await this.supabase
        .from('products')
        .update(dtoPayload)
        .eq('id', product.id); 

      if (error) throw error;

      // 2. 🚀 TRUCO DE ALTA VELOCIDAD LOCAL:
      // Actualizamos la celda modificada de forma inmutable instantánea.
      this._products.update(current => {
        const updatedList = current.map(p => p.id === product.id ? product : p);
        return [...updatedList]; 
      });

    } catch (err) {
      console.error('Error al actualizar producto en Supabase:', err);
    }
  }

  // 📝 MAPPER DEFENSIVO ABSOLUTO UNIFICADO:
  // Captura el valor ya sea que venga como camelCase, snake_case o payload parcial de Realtime
  private mapToDomain(dto: any): Product {
    return {
      id: dto.id,
      sku: dto.sku_id || dto.sku || 'SIN-SKU',
      name: dto.product_name || dto.name,
      category: dto.category_name || dto.category,
      brand: dto.brand_name || dto.brand || 'Sin Marca',
      unit: dto.unit_name || dto.unit || 'Unidad',
      supplier: dto.supplier_name || dto.supplier || 'Sin Proveedor',
      
      // Busca de forma redundante en todas las variantes posibles de nombres para el stock
      stock: dto.current_stock !== undefined ? Number(dto.current_stock) : Number(dto.stock ?? 0),
      minStock: dto.minimum_stock !== undefined ? Number(dto.minimum_stock) : Number(dto.minStock ?? 0),
      
      status: dto.inventory_status || dto.status || 'Óptimo',
      buyprice: dto.buyprice || dto.buyPrice,
      price: dto.unit_price || dto.price,
      imageurl: dto.imageurl || dto.imageUrl
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
      current_stock: Number(model.stock),
      minimum_stock: Number(model.minStock),
      inventory_status: model.status,
      buyprice: model.buyprice,
      unit_price: model.price,
      imageurl: model.imageurl
    };
  }
}
