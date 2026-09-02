import { Component, inject, signal, computed, OnInit } from '@angular/core'; // <-- Importado OnInit
import { CASH_CLOSURE_REPOSITORY, CashClosure } from '../../data-access/cash-closure.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-audit-panel',
  standalone: true,
  imports: [RouterModule], // Control flow nativo en plantilla (@if, @for)
  templateUrl: './audit-panel.html',
})
export class AuditPanelComponent implements OnInit { // <-- Implementa la interfaz OnInit
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

  // Ejecuta la recarga limpia invocando los cargadores de los repositorios inyectados
  private refreshFinancialData(): void {
    console.log('🔄 Refrescando balance fiscal de B&R Solutions desde Supabase...');
    
    // Si tus repositorios exponen un método para forzar la carga, se gatillan aquí
    if (typeof (this.posRepo as any).load === 'function') {
      (this.posRepo as any).load();
    }
    if (typeof (this.closureRepo as any).load === 'function') {
      (this.closureRepo as any).load();
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

  // 🚀 CONSOLIDACIÓN MAESTRA DE JORNADA FISCAL
  async executeClosure(): Promise<void> {
    const calcs = this.closureCalculations();
    const salesIds = this.todaySales().map((s) => s.id); // Captura los folios activos

    // Despacha la acción de forma directa
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
        operator: 'Carlos Méndez',
      },
      salesIds,
    );

    this.isClosureModalOpen.set(false);
    this.realCashInput.set('');
    
    // Volvemos a refrescar los datos tras consolidar el cierre para vaciar la Jornada Abierta
    this.refreshFinancialData();
    
    alert('Cierre de caja consolidado con éxito. Balance de jornada reiniciado a $0.');
  }

  formatCurrency(val: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val);
  }
}
