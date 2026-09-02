import { Injectable, inject, signal, Signal } from '@angular/core';
import { PurchaseRepository } from './purchase.repository';
import { PurchaseOrder } from '../models/purchase.model';
import { SupabaseService } from '../../../core/services/supabase.service';

@Injectable({ providedIn: 'root' })
export class SupabasePurchaseRepository implements PurchaseRepository {
  private readonly supabase = inject(SupabaseService).client;
  private readonly _orders = signal<PurchaseOrder[]>([]);

  constructor() { this.loadOrders(); }

  getOrders(): Signal<PurchaseOrder[]> { return this._orders.asReadonly(); }

  async loadOrders(): Promise<void> {
    const { data } = await this.supabase.from('purchase_orders').select('*').order('created_at', { ascending: false });
    if (data) {
      this._orders.set(data.map((r: any) => ({
        id: r.id, supplierName: r.supplier_name, totalAmount: Number(r.total_amount),
        status: r.status, createdAt: r.created_at, operator: r.operator,
        items: JSON.parse(r.items_json)
      })));
    }
  }

  async createOrder(order: PurchaseOrder): Promise<void> {
    const { error } = await this.supabase.from('purchase_orders').insert([{
      id: order.id, supplier_name: order.supplierName, total_amount: order.totalAmount,
      status: order.status, operator: order.operator, items_json: JSON.stringify(order.items)
    }]);
    if (!error) this.loadOrders();
  }

  async receiveOrder(orderId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('purchase_orders')
        .update({ status: 'Recibido' })
        .eq('id', orderId); // Cláusula WHERE estructurada

      if (error) throw error;

      // 📌 ULTRA COHESIÓN REACTIVA: Mutación inmutable de la señal local en memoria.
      // Angular v22 detectará el cambio al vuelo, removerá el botón "Recibir Lote" 
      // y actualizará los nombres de los operarios sin obligar a recargar la página.
      this._orders.update(currentOrders => 
        currentOrders.map(order => 
          order.id === orderId ? { ...order, status: 'Recibido' } : order
        )
      );

    } catch (err) {
      console.error(`Error crítico al consolidar el estatus de la Orden [${orderId}] en Supabase:`, err);
      throw err;
    }
  }
}
