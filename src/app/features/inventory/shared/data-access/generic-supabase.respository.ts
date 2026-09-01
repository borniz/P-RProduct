import { signal, Signal, inject } from '@angular/core';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { GenericInventoryItem, GenericDto } from '../models/generic-inventory.model';

export class GenericSupabaseRepository {
  // Inyectamos la conexión global nativa de la infraestructura de B&R Solutions
  protected readonly supabase = inject(SupabaseService).client;

  // Canal reactivo maestro en memoria protegido
  protected readonly _items = signal<GenericInventoryItem[]>([]);

  constructor(private readonly tableName: string) {
    // Carga asíncrona automatizada al instanciar el submódulo correspondiente
    this.loadFromSupabase();
  }

  getItemsSignal(): Signal<GenericInventoryItem[]> {
    return this._items.asReadonly();
  }

  // 📥 READ: Consulta dinámica parametrizada por nombre de tabla SQL
  async loadFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      if (data) {
        const mapped = (data as GenericDto[]).map(dto => this.mapToDomain(dto));
        this._items.set(mapped);
      }
    } catch (err) {
      console.error(`Error crítico al leer tabla [${this.tableName}] de Supabase:`, err);
    }
  }

  // 📤 CREATE: Inserción remota asíncrona Zoneless
  async addItem(item: GenericInventoryItem): Promise<void> {
    try {
      const dtoPayload = this.mapToDto(item);

      const { error } = await this.supabase
        .from(this.tableName)
        .insert([dtoPayload]);

      if (error) throw error;

      // Optimistic UI Update: Refrescamos la vista local inmediatamente sin congelar la pantalla
      this._items.update(current => [item, ...current]);
    } catch (err) {
      console.error(`Error al insertar en la tabla [${this.tableName}]:`, err);
    }
  }

  // 🔄 UPDATE: Modificación SQL por ID relacional
  async updateItem(item: GenericInventoryItem): Promise<void> {
    try {
      const dtoPayload = this.mapToDto(item);

      const { error } = await this.supabase
        .from(this.tableName)
        .update(dtoPayload)
        .eq('id', item.id);

      if (error) throw error;

      // Actualización reactiva instantánea sobre la fila afectada del Signal
      this._items.update(current => 
        current.map(i => i.id === item.id ? item : i)
      );
    } catch (err) {
      console.error(`Error al actualizar registro en la tabla [${this.tableName}]:`, err);
    }
  }

  // 📝 MAPPERS TRANSVERSALES DE DATOS
  private mapToDomain(dto: GenericDto): GenericInventoryItem {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      description: dto.description || undefined,
      metricCount: dto.metric_count,
      isActive: dto.is_active
    };
  }

  private mapToDto(model: GenericInventoryItem): Partial<GenericDto> {
  // 1. Instanciamos el payload base obligatorio que comparten TODAS las tablas
  const dto: any = {
    id: model.id,
    code: model.code,
    name: model.name,
    is_active: model.isActive
  };

  // 2. Omitimos 'description' si la tabla es 'units' para evitar el rechazo de Postgres
  if (this.tableName !== 'units' && model.description !== undefined) {
    dto.description = model.description || null;
  }

  // 3. Omitimos 'metric_count' si viene en 0 o si la tabla es de unidades
  if (this.tableName !== 'units' && model.metricCount !== undefined) {
    dto.metric_count = model.metricCount || 0;
  }

  return dto;
}

}
