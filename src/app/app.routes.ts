import { Routes } from '@angular/router';
import { AppShell } from './core/layout/app-shell/app-shell';
import { PRODUCT_REPOSITORY } from './features/products/data-access/product.repository';
import { SupabaseProductRepository } from './features/products/data-access/supabase-product.repository';

export const routes: Routes = [
  // 1. Redirección de escape en la raíz absoluta para evitar congelamientos en blanco
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  
  // 2. Nodo estructural del Layout unificado (AppShell maestro)
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      
      // 📌 MÓDULO AUTÓNOMO DE PRODUCTOS (Agrupado con sus propios proveedores locales)
      {
        path: 'products',
        providers: [{ provide: PRODUCT_REPOSITORY, useClass: SupabaseProductRepository }],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/products/pages/product-list/products').then((m) => m.Products),
          },
          {
            path: 'create',
            loadComponent: () =>
              import('./features/products/pages/product-create/product-create').then(
                (m) => m.ProductCreate,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./features/products/pages/product-create/product-create').then(
                (m) => m.ProductCreate,
              ),
          },
        ],
      },

      // 📌 MÓDULO DE CONFIGURACIÓN GLOBAL (Independiente a primer nivel del AppShell)
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
    ],
  },
  
  // 3. Comodín de seguridad final para atrapar URLs rotas
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
