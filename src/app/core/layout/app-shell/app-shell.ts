import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
@Component({
  imports: [RouterOutlet,Sidebar,Header],
  selector: 'app-app-shell',
  styleUrl: './app-shell.css',
  templateUrl: './app-shell.html',
})
export class AppShell {
  // Estado reactivo para controlar el menú colapsable en dispositivos móviles
  readonly isMobileMenuOpen = signal<boolean>(false);

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update(state => !state);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }
}
