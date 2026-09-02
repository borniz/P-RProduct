import { Injectable, inject, signal, Signal } from '@angular/core';
import { CashClosureRepository, CashClosure } from './cash-closure.repository';
import { SupabaseService } from '../../../core/services/supabase.service';
import { POS_REPOSITORY } from '../../pos/data-acces/pos.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseCashClosureRepository implements CashClosureRepository {
  private readonly supabase = inject(SupabaseService).client;
  
  // 📌 SOLUCCIÓN INTEGRAL: Mover la inyección al Injection Context válido (Inicializador de Campo)
  // Esto le permite a Angular v22 resolver el token de forma legal antes de ejecutar las promesas
  private readonly posRepo = inject(POS_REPOSITORY);

  private readonly _closures = signal<CashClosure[]>([]);

  constructor() { 
    this.loadClosures(); 
  }

  getClosures(): Signal<CashClosure[]> { 
    return this._closures.asReadonly(); 
  }

  async loadClosures(): Promise<void> {
    const { data } = await this.supabase
      .from('cash_closures')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) {
      this._closures.set(data.map((r: any) => ({
        id: r.id, closureDate: r.closure_date, salesCount: r.sales_count,
        expectedCash: Number(r.expected_cash), expectedCards: Number(r.expected_cards),
        expectedTransfers: Number(r.expected_transfers), totalExpected: Number(r.total_expected),
        realCash: Number(r.real_cash), diffAmount: Number(r.diff_amount), status: r.status, operator: r.operator
      })));
    }
  }

  async saveClosure(closure: Omit<CashClosure, 'id'>, todaySalesIds: string[]): Promise<void> {
    try {
      // 1. Insertamos el arqueo en Supabase y obtenemos el UUID generado
      const { data, error } = await this.supabase
        .from('cash_closures')
        .insert([{
          expected_cash: closure.expectedCash,
          expected_cards: closure.expectedCards,
          expected_transfers: closure.expectedTransfers,
          total_expected: closure.totalExpected,
          real_cash: closure.realCash,
          diff_amount: closure.diffAmount,
          status: closure.status,
          operator: closure.operator,
          sales_count: closure.salesCount
        }])
        .select('id')
        .single();

      if (error) throw error;

      // 2. Vinculamos las facturas del turno activo al UUID del arqueo cerrado
      if (data && todaySalesIds.length > 0) {
        const { error: updateError } = await this.supabase
          .from('sales_invoices')
          .update({ cash_closure_id: data.id })
          .in('id', todaySalesIds);

        if (updateError) throw updateError;
      }

      // 3. Refrescamos de forma asíncrona y segura las vistas locales
      await this.loadClosures();
      
      // 🚀 SEGURO: Invocamos la recarga usando la propiedad pre-inyectada de la clase libre de errores
      if (this.posRepo && 'loadSalesFromSupabase' in this.posRepo) {
        await (this.posRepo as any).loadSalesFromSupabase();
      }

    } catch (err) {
      console.error('Error crítico en la transacción de cierre de caja en Supabase:', err);
      throw err;
    }
  }
}
