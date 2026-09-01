import { Component, signal, inject, output } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service'; // Verifica tu ruta física

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [], // Control flow nativo
  templateUrl: './header.html'
})
export class Header {
  // Salida nativa para el menú hamburguesa
  readonly toggleMenu = output<void>();

  // Inyección del motor de alertas vivas de Supabase
  private readonly notificationService = inject(NotificationService);

  // Exponemos las señales del servicio hacia la plantilla HTML
  readonly appNotifications = this.notificationService.notifications;
  readonly alertCount = this.notificationService.unreadCount;

  // 🔔 REGLA DE INGENIERÍA: Estado reactivo local para alternar la visibilidad del dropdown
  readonly isNotificationOpen = signal<boolean>(false);

  // Método interactivo para prender y apagar el menú al oprimir la campana
  toggleNotifications(): void {
    this.isNotificationOpen.update(current => !current);
  }
}
