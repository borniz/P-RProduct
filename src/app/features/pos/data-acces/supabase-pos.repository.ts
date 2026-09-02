import { Injectable, inject, signal, Signal } from '@angular/core';
import { PosRepository } from './pos.repository';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SaleInvoice } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class SupabasePosRepository implements PosRepository {
  private readonly supabase = inject(SupabaseService).client;

  // 📌 ESTADO MAESTRO DE VENTAS EN MEMORIA
  private readonly _sales = signal<SaleInvoice[]>([]);

  constructor() {
    // Descarga automática de facturación al iniciar el ERP de B&R Solutions
    this.loadSalesFromSupabase();
  }

  // 🚀 EL PUENTE QUE LE FALTABA A FINANZAS:
  // Al agregar este método, el panel de auditoría podrá obligar a Supabase
  // a descargar las últimas boletas emitidas apenas el usuario cambie de pestaña
  async load(): Promise<void> {
    await this.loadSalesFromSupabase();
  }

  // Retorna la señal de solo lectura para el Dashboard
  getSales(): Signal<SaleInvoice[]> {
    return this._sales.asReadonly();
  }

  // 📥 READ: Petición real por red a Supabase
  async loadSalesFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('sales_invoices') // Asegúrese de que coincida con el nombre de su tabla en Postgres
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // 🚀 CONVERSIÓN Y CLONACIÓN INMUTABLE:
        // Ejecuta el mapeador para cada registro y clona el arreglo con [...] para disparar los computed
        const mappedSales = data.map((dto) => this.mapToDomain(dto));
        this._sales.set([...mappedSales]);
      }
    } catch (err) {
      console.error('Error al sincronizar el histórico de ventas desde Supabase:', err);
    }
  }

  // 📤 CREATE: Inserta la boleta en la nube y refresca las señales en milisegundos
  async processSale(invoice: SaleInvoice): Promise<void> {
    try {
      const { error } = await this.supabase.from('sales_invoices').insert([
        {
          id: invoice.id,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          payment_method: invoice.paymentMethod,
          operator: invoice.operator,
          cash_closure_id: invoice.cashClosureId || null,
          items_snapshot: JSON.stringify(invoice.items),
        },
      ]);

      if (error) throw error;

      // 📌 ULTRA COHESIÓN: Actualizamos la señal local.
      // El Dashboard recalculará los porcentajes semanales y mensuales al instante.
      this._sales.update((current) => [invoice, ...current]);
    } catch (err) {
      console.error('Error al registrar la boleta de venta en Supabase:', err);
      throw err;
    }
  }

  private mapToDomain(dto: any): any {
    return {
      id: dto.id,
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.total,
      // 📌 Normaliza los nombres de variables asegurando compatibilidad con el HTML del POS y Finanzas
      paymentMethod: dto.payment_method || dto.paymentMethod,
      createdAt: dto.created_at || dto.createdAt,
      operator: dto.operator,
      cashClosureId: dto.cash_closure_id || dto.cashClosureId,
    };
  }
}
