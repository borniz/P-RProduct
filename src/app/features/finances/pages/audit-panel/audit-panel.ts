import { Component, inject, signal, computed, OnInit, effect } from '@angular/core';
import { CASH_CLOSURE_REPOSITORY, CashClosure } from '../../data-access/cash-closure.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { LoadingService } from '../../../../core/services/loading.service';

@Component({
  selector: 'app-audit-panel',
  standalone: true,
  imports: [RouterModule], // Control flow nativo en plantilla (@if, @for)
  templateUrl: './audit-panel.html',
})
export class AuditPanelComponent implements OnInit {
  private readonly loadingService = inject(LoadingService);
  private readonly authService = inject(AuthService);
  private readonly posRepo = inject(POS_REPOSITORY);
  private readonly closureRepo = inject(CASH_CLOSURE_REPOSITORY);

  // Canales de lectura directos desde Supabase
  readonly allSales = this.posRepo.getSales();
  readonly closures = this.closureRepo.getClosures();

  // Estados reactivos locales para formularios y modales elásticos
  readonly realCashInput = signal<string>('');
  readonly isClosureModalOpen = signal<boolean>(false);

  // 📌 SEÑALES DE CONTROL PARA LA INSPECCIÓN DEL HISTÓRICO
  readonly selectedClosure = signal<CashClosure | null>(null);
  readonly isHistoryPanelOpen = signal<boolean>(false);

  // 🚀 REFRESCAR AL ABRIR LA VISTA (Garantiza datos actualizados en cada ingreso)
  ngOnInit(): void {
    this.refreshFinancialData();
  }

  // 🔄 RECARGA DE RED: Despliega la barra de progreso elástica mientras refresca el balance fiscal
  async refreshFinancialData(): Promise<void> {
    console.log('🔄 Sincronizando balances contables desde Supabase...');

    // Enciende el overlay reutilizable centralizado
    this.loadingService.show('Sincronizando balance fiscal con la base de datos remota...');

    try {
      // 1. Forzamos a los repositorios a ir a buscar los datos frescos a la nube
      const promesas: Promise<void>[] = [];

      if (typeof (this.posRepo as any).load === 'function') {
        promesas.push((this.posRepo as any).load());
      }
      if (typeof (this.closureRepo as any).load === 'function') {
        promesas.push((this.closureRepo as any).load());
      }

      if (promesas.length > 0) {
        await Promise.all(promesas);
      }

      // 2. 🚀 TRUCO DE RE-RENDERIZADO TRANSACCIONAL
      const currentInput = this.realCashInput();
      this.realCashInput.set(' ');

      setTimeout(() => {
        this.realCashInput.set(currentInput);
        this.loadingService.hide(); // Finaliza completando al 100% de forma fluida
      }, 50);
    } catch (error) {
      this.loadingService.hide();
    }
  }
  // 📌 FILTRADO CONTABLE: Muestra únicamente las boletas que NO tienen un cierre asignado (Jornada Viva)
  readonly activeSales = computed(() => {
    return this.allSales().filter((s) => !s.cashClosureId);
  });

  // Ventas emitidas estrictamente el día de hoy dentro de la jornada abierta
  readonly todaySales = computed(() => {
    const todayStr = new Date().toISOString().substring(0, 10);
    return this.activeSales().filter((s) => s.createdAt.startsWith(todayStr));
  });

  // Arqueo y desglose de caja automático por Signals derivados
  readonly todayTotals = computed(() => {
    let cash = 0;
    let cards = 0;
    let transfers = 0;
    this.todaySales().forEach((s) => {
      if (s.paymentMethod === 'Efectivo') cash += s.total;
      else if (s.paymentMethod === 'Tarjetas') cards += s.total;
      else transfers += s.total;
    });
    return { cash, cards, transfers, total: cash + cards + transfers };
  });

  readonly closureCalculations = computed(() => {
    const expected = this.todayTotals().cash;
    const real = Number(this.realCashInput()) || 0;
    const diff = real - expected;
    let status: 'Cuadrado' | 'Faltante' | 'Sobrante' = 'Cuadrado';
    if (diff < 0) status = 'Faltante';
    else if (diff > 0) status = 'Sobrante';
    return { expected, real, diff, status };
  });

  // 📌 NUEVA SEÑAL DERIVADA: Extrae las facturas guardadas asociadas al cierre histórico seleccionado
  readonly historyAssociatedInvoices = computed(() => {
    const closure = this.selectedClosure();
    if (!closure) return [];
    return this.allSales().filter((s) => s.cashClosureId === closure.id);
  });

  onInputRealCash(e: Event): void {
    const input = e.target as HTMLInputElement;
    input.value = input.value.replace(/\D/g, '');
    this.realCashInput.set(input.value);
  }

  // 📌 ACCIÓN INTERACTIVA: Abre el sub-panel lateral inyectando la información del arqueo
  inspectHistoricalClosure(closure: CashClosure): void {
    this.selectedClosure.set(closure);
    this.isHistoryPanelOpen.set(true);
  }

  // 🚀 CONSOLIDACIÓN MAESTRA DE JORNADA FISCAL (ENGANCHADA AL LOADING SERVICE)
  async executeClosure(): Promise<void> {
    const calcs = this.closureCalculations();
    const salesIds = this.todaySales().map((s) => s.id); // Captura los folios activos

    // Congela el lienzo del Arqueo con el modal de porcentaje real
    this.loadingService.show('Firmando libro de arqueo contable y reseteando terminales POS...');

    try {
      // Despacha la acción de persistencia en bloque hacia PostgreSQL
      await this.closureRepo.saveClosure(
        {
          closureDate: new Date().toISOString().substring(0, 10),
          salesCount: this.todaySales().length,
          expectedCash: this.todayTotals().cash,
          expectedCards: this.todayTotals().cards,
          expectedTransfers: this.todayTotals().transfers,
          totalExpected: this.todayTotals().total,
          realCash: calcs.real,
          diffAmount: calcs.diff,
          status: calcs.status,
          operator: this.authService.currentOperatorName(),
        },
        salesIds,
      );

      this.isClosureModalOpen.set(false);
      this.realCashInput.set('');

      // Volvemos a refrescar de forma asíncrona para vaciar la Jornada Abierta
      await this.refreshFinancialData();

      // Desmontamos la carga
      this.loadingService.hide();
      alert('Cierre de caja consolidado con éxito. Balance de jornada reiniciado a $0.');
    } catch (err) {
      this.loadingService.hide();
      alert('Error crítico de red: No se pudo subir el libro contable de arqueo a Supabase.');
    }
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  }
}
