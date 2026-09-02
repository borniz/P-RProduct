import { Injectable, inject, signal, Signal, NgZone } from '@angular/core'; // 📌 1. Importa NgZone
import { PosRepository } from './pos.repository';
import { SupabaseService } from '../../../core/services/supabase.service';
import { SaleInvoice } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class SupabasePosRepository implements PosRepository {
  private readonly supabase = inject(SupabaseService).client;
  private readonly zone = inject(NgZone); // 📌 2. Inyecta el controlador de zona reactiva

  private readonly _sales = signal<SaleInvoice[]>([]);

  constructor() {
    this.loadSalesFromSupabase();

    setTimeout(() => {
      this.supabase
        .channel('cambios-ventas-pos')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'sales_invoices' },
          (payload) => {
            // 🚀 LA MAGIA: Obliga a Angular a procesar la señal de internet en su zona maestra
            this.zone.run(() => {
              const newInvoice = this.mapToDomain(payload.new);
              
              this._sales.update((current) => {
                const exists = current.some(sale => sale.id === newInvoice.id);
                if (exists) return current;
                
                // Generamos un arreglo CLONADO NUEVO con [...] para re-activar los computed ajenos
                return [newInvoice, ...current];
              });
            });
          }
        )
        .subscribe();
    }, 0);
  }

  async load(): Promise<void> {
    await this.loadSalesFromSupabase();
  }

  getSales(): Signal<SaleInvoice[]> {
    return this._sales.asReadonly();
  }

  async loadSalesFromSupabase(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('sales_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedSales = data.map((dto) => this.mapToDomain(dto));
        this._sales.set([...mappedSales]);
      }
    } catch (err) {
      console.error('Error al sincronizar el histórico de ventas:', err);
    }
  }

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
      this._sales.update((current) => [invoice, ...current]);
    } catch (err) {
      console.error('Error al registrar la boleta:', err);
      throw err;
    }
  }

  private mapToDomain(dto: any): any {
    return {
      id: dto.id,
      subtotal: dto.subtotal,
      tax: dto.tax,
      total: dto.total,
      paymentMethod: dto.payment_method || dto.paymentMethod,
      createdAt: dto.created_at || dto.createdAt,
      operator: dto.operator,
      cashClosureId: dto.cash_closure_id || dto.cashClosureId,
      itemsSnapshot: dto.items_snapshot || dto.itemsSnapshot || null
    };
  }
}
