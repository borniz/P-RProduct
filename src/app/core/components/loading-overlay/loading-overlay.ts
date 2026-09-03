import { Component, inject } from '@angular/core';
import { LoadingService } from '../../services/loading.service';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  imports: [], // Utiliza el control flow nativo v22 (@if)
  templateUrl: './loading-overlay.html'
})
export class LoadingOverlayComponent {
  private readonly loadingService = inject(LoadingService);

  // Mapeamos las señales globales de solo lectura
  readonly isActive = this.loadingService.isActive;
  readonly progress = this.loadingService.progress;
  readonly message = this.loadingService.message;
}
