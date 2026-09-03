import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service'; // Asegura tu ruta física del cliente

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private readonly supabase = inject(SupabaseService).client;

  async sendInvoiceEmail(email: string, idVenta: string | number): Promise<any> {
    // 🚀 ALINEACIÓN DE VARIABLES: Enviamos exactamente 'invoiceId' y 'targetEmail' 
    // tal como los lee tu Edge Function en el bloque req.json()
    const { data, error } = await this.supabase.functions.invoke('send-digital-invoice', {
      body: { 
        invoiceId: idVenta, 
        targetEmail: email 
      }
    });

    if (error) throw error;
    return data;
  }
}
