import { Injectable, signal, effect, computed } from '@angular/core';

export type ViewMode = 'table' | 'grid';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  // Signal reactivo global que almacena la preferencia visual de la UI
  private readonly _applyTax = signal<boolean>(true);
  readonly applyTax = this._applyTax.asReadonly();

  readonly productViewMode = signal<ViewMode>(
    (localStorage.getItem('br_product_view_mode') as ViewMode) || 'table',
  );
  readonly taxRate = computed(() => (this._applyTax() ? 0.19 : 0.0));
  constructor() {
    // Efecto nativo: Cada vez que la señal cambie, se guarda automáticamente en el navegador
    effect(() => {
      localStorage.setItem('br_product_view_mode', this.productViewMode());
    });
  }

  // Método para actualizar la preferencia desde cualquier pantalla
  setViewMode(mode: ViewMode): void {
    this.productViewMode.set(mode);
  }
  setTaxConfiguration(status: boolean): void {
    this._applyTax.set(status);
  }
}
