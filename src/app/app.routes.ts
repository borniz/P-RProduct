import { Routes } from '@angular/router';
import { AppShell } from './core/layout/app-shell/app-shell';

export const routes: Routes = [
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'products', // <-- Registrada de forma real y responsiva
        loadComponent: () => import('./features/products/pages/product-list/products').then(m => m.Products)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard)
      }
    ]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
