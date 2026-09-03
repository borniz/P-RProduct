import { Injectable, signal, inject, Signal } from '@angular/core';
import { SupabaseService } from '../../../core/services/supabase.service'; // Asegura tu ruta física del cliente
import { PosRepository } from './pos.repository';
import { SaleInvoice } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class SupabasePosRepository implements PosRepository {
  private readonly supabase = inject(SupabaseService).client;

  // 🔒 Signal interno privado para resguardar la inmutabilidad de la colección
  private readonly _sales = signal<SaleInvoice[]>([]);

  // Exposición maestra emparejada con tu interfaz
  readonly salesSignal: Signal<SaleInvoice[]> = this._sales.asReadonly();

  getSales(): Signal<SaleInvoice[]> {
    return this.salesSignal;
  }

  // 🔄 CARGADOR LOGÍSTICO: Descarga el histórico de ventas sincronizado con tu imagen de Supabase
  async load(): Promise<void> {
    // Se fuerza el orden descendente usando la columna exacta 'created_at' de tu foto relacional
    const { data, error } = await this.supabase
      .from('sales_invoices')
      .select(
        `
    id,
    subtotal,
    tax,
    total,
    payment_method,
    operator,
    items_snapshot,
    created_at,
    cash_closure_id
  `,
      )
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('❌ Error de consulta en sales_invoices:', error);
      return;
    }

    

    if (data) {
      // Hidratamos y mapeamos los esquemas snake_case de PostgreSQL hacia tus variables camelCase de TypeScript
      const mappedSales: SaleInvoice[] = data.map((r: any) => {
        let parsedItems: any[] = [];

        // 📌 PARCHE DE COHESIÓN: Deserializa el bloque JSONB de Supabase de forma segura hacia la variable 'items'
        if (typeof r.items_snapshot === 'string') {
          try {
            parsedItems = JSON.parse(r.items_snapshot);
          } catch (e) {
            parsedItems = [];
          }
        } else if (Array.isArray(r.items_snapshot)) {
          parsedItems = r.items_snapshot;
        }

        return {
          id: r.id,
          subtotal: r.subtotal,
          tax: r.tax,
          total: r.total,
          paymentMethod: r.payment_method, // Convierte payment_method a paymentMethod
          operator: r.operator,
          items: parsedItems, // 🚀 SOLUCIÓN: Asigna el snapshot JSONB directamente a la propiedad obligatoria 'items'
          createdAt: r.created_at,
          cashClosureId: r.cash_closure_id, // Convierte cash_closure_id a cashClosureId
        };
      });

      this._sales.set(mappedSales);
    }
  }

  // 🚀 PROCESADOR DE CHECKOUT: Inserta la boleta en la base de datos central en la nube
  async processSale(invoice: SaleInvoice): Promise<void> {
    
    // 📌 FILTRO DE INGENIERÍA: Sanitizamos el snapshot removiendo Base64 para que PostgreSQL nunca sufra un Timeout
    const sanitizedItems = invoice.items.map((item: any) => ({
      ...item,
      product: {
        ...item.product,
        imageurl: item.product.imageurl?.startsWith('data:') ? 'IMAGEN-LOCAL-REMOVIDA-POR-SEGURIDAD' : item.product.imageurl
      }
    }));

    const { error } = await this.supabase
      .from('sales_invoices')
      .insert([{
        id: invoice.id,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        total: invoice.total,
        payment_method: invoice.paymentMethod,
        operator: invoice.operator,
        // Guardamos el arreglo purificado libre de megabytes de texto
        items_snapshot: JSON.stringify(sanitizedItems),
        cash_closure_id: invoice.cashClosureId
      }]);

    if (error) {
      console.error('❌ Error al insertar boleta en Supabase:', error.message);
      throw error;
    }

    await this.load();
  }
  async sendInvoiceToEmail(email: string, invoice: SaleInvoice): Promise<void> {
    const { data, error } = await this.supabase.functions.invoke('send-digital-invoice', {
      body: {
        targetEmail: email,
        invoice: invoice.id,
      },
    });

    if (error) {
      console.error('❌ Error en el puente de la Edge Function:', error.message);
      throw error;
    }
  }
}
