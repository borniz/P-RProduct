import { Injectable, signal, Signal, inject } from '@angular/core';
import { StockRepository, StockMovementDto } from './stock.repository';
import { StockMovement } from '../models/stock.model';
import { SupabaseService } from '../../../../core/services/supabase.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseStockRepository implements StockRepository {
  // Conexión nativa de la infraestructura de B&R Solutions
  private readonly supabase = inject(SupabaseService).client;

  // Estado reactivo del Kardex en memoria
  private readonly _movements = signal<StockMovement[]>([]);

  constructor() {
    this.loadMovementsFromSupabase();
  }

  getMovements(): Signal<StockMovement[]> {
    return this._movements.asReadonly();
  }

  // 📥 READ: Descarga el histórico de transacciones en vivo
  async loadMovementsFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false }); // Orden cronológico descendente inverso

      if (error) throw error;

      if (data) {
        const mapped = (data as StockMovementDto[]).map(dto => this.mapToDomain(dto));
        this._movements.set(mapped);
      }
    } catch (err) {
      console.error('Error al descargar auditorías de Kardex desde Supabase:', err);
    }
  }

  // 📤 CREATE: Inserta una fila física de movimiento en Postgres
  async registerMovement(movement: StockMovement): Promise<void> {
    try {
      const dtoPayload = this.mapToDto(movement);

      const { error } = await this.supabase
        .from('stock_movements')
        .insert([dtoPayload]);

      if (error) throw error;

      // Optimistic UI Update: Inyectamos el movimiento arriba de la lista en milisegundos
      this._movements.update(current => [movement, ...current]);
    } catch (err) {
      console.error('Error al persistir movimiento en Supabase:', err);
      throw err; // Re-lanzamos para que la UI pueda capturar fallos de red
    }
  }

  // 📝 MAPPERS DE DESACOPLAMIENTO
  private mapToDomain(dto: StockMovementDto): StockMovement {
    return {
      id: dto.id,
      productName: dto.product_name,
      type: dto.type,
      quantity: dto.quantity,
      reason: dto.reason,
      // Usamos el campo created_at formateado de la base de datos o la fecha local
      date: dto.created_at ? dto.created_at.replace('T', ' ').substring(0, 16) : new Date().toISOString().substring(0, 10),
      operator: dto.operator
    };
  }

  private mapToDto(model: StockMovement): StockMovementDto {
    return {
      id: model.id,
      product_name: model.productName,
      type: model.type,
      quantity: model.quantity,
      reason: model.reason,
      operator: model.operator
    };
  }
}
