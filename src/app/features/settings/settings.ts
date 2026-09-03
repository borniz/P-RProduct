import { Component, inject } from '@angular/core';
import { SettingsService, ViewMode } from '../../core/services/settings.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [RouterModule], // Control flow nativo
  templateUrl: './settings.html'
})
export class SettingsComponent {
  // Inyección del motor de configuraciones transversales
  private readonly settingsService = inject(SettingsService);

  // Leemos la señal global expuesta de solo lectura para la UI
  readonly currentMode = this.settingsService.productViewMode;
  readonly applyTax = this.settingsService.applyTax;

  changeViewMode(mode: ViewMode): void {
    this.settingsService.setViewMode(mode);
  }
    onTaxToggle(event: Event): void {
      alert("se cambio la configuracion")
    const checkbox = event.target as HTMLInputElement;
    this.settingsService.setTaxConfiguration(checkbox.checked);
  }

}
