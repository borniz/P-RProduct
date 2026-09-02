import { Component, signal, inject, output } from '@angular/core';
import { NotificationService } from '../../../core/services/notification.service'; // Verifica tu ruta física
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [], // Control flow nativo
  templateUrl: './header.html',
})
export class Header {
  // Salida nativa para el menú hamburguesa
  private readonly authService = inject(AuthService);
  readonly toggleMenu = output<void>();
  readonly isUserMenuOpen = signal<boolean>(false);
  // Inyección del motor de alertas vivas de Supabase
  private readonly notificationService = inject(NotificationService);

  // Exponemos las señales del servicio hacia la plantilla HTML
  readonly availableUsers = this.authService.availableUsers;
  readonly currentUser = this.authService.currentUser;
  readonly currentOperatorName = this.authService.currentOperatorName;
  readonly currentOperatorRole = this.authService.currentOperatorRole;
  readonly appNotifications = this.notificationService.notifications;
  readonly alertCount = this.notificationService.unreadCount;

  // 🔔 REGLA DE INGENIERÍA: Estado reactivo local para alternar la visibilidad del dropdown
  readonly isNotificationOpen = signal<boolean>(false);

  // Método interactivo para prender y apagar el menú al oprimir la campana
  toggleNotifications(): void {
    this.isNotificationOpen.update((current) => !current);
  }
  toggleUserMenu(): void {
    this.isUserMenuOpen.update((current) => !current);
  }
  onUserSwitch(userId: string): void {
    const targetUser = this.availableUsers().find((u) => u.id === userId);
    if (targetUser) {
      this.authService.switchUser(targetUser);
      this.isUserMenuOpen.set(false); // Cierre automático del menú táctil
    }
  }
}
