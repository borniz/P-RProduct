import { Injectable, inject, signal, Signal } from '@angular/core';
import { PosRepository } from './pos.repository';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SaleInvoice } from '../models/pos.models';

@Injectable({
  providedIn: 'root'
})
export class SupabasePosRepository implements PosRepository {
  private readonly supabase = inject(SupabaseService).client;

  // 📌 ESTADO MAESTRO DE VENTAS EN MEMORIA
  private readonly _sales = signal<SaleInvoice[]>([]);

  constructor() {
    // Descarga automática de facturación al iniciar el ERP de B&R Solutions
    this.loadSalesFromSupabase();
  }

  // Retorna la señal de solo lectura para el Dashboard
  getSales(): Signal<SaleInvoice[]> {
    return this._sales.asReadonly();
  }

  // 📥 READ: Petición real por red a Supabase
  async loadSalesFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('sales_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        // Mapeamos las filas de Postgres al modelo tipado de la UI
        const mappedSales: SaleInvoice[] = data.map((row: any) => ({
          id: row.id,
          subtotal: Number(row.subtotal),
          tax: Number(row.tax),
          total: Number(row.total),
          paymentMethod: row.payment_method,
          createdAt: row.created_at,
          operator: row.operator,
          items: JSON.parse(row.items_snapshot) // Deserializamos el JSON de los artículos
        }));
        
        this._sales.set(mappedSales);
      }
    } catch (err) {
      console.error('Error al descargar histórico de ventas desde Supabase:', err);
    }
  }

  // 📤 CREATE: Inserta la boleta en la nube y refresca las señales en milisegundos
  async processSale(invoice: SaleInvoice): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sales_invoices')
        .insert([{
          id: invoice.id,
          subtotal: invoice.subtotal,
          tax: invoice.tax,
          total: invoice.total,
          payment_method: invoice.paymentMethod,
          operator: invoice.operator,
          items_snapshot: JSON.stringify(invoice.items) 
        }]);

      if (error) throw error;

      // 📌 ULTRA COHESIÓN: Actualizamos la señal local. 
      // El Dashboard recalculará los porcentajes semanales y mensuales al instante.
      this._sales.update(current => [invoice, ...current]);
    } catch (err) {
      console.error('Error al registrar la boleta de venta en Supabase:', err);
      throw err;
    }
  }
}
