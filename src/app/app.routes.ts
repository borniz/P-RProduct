import { Routes } from '@angular/router';
import { AppShell } from './core/layout/app-shell/app-shell';
import { PRODUCT_REPOSITORY } from './features/products/data-access/product.repository';
import { SupabaseProductRepository } from './features/products/data-access/supabase-product.repository';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      // 📌 MEJOR PRÁCTICA: Agrupamos las rutas de productos bajo un mismo proveedor compartido
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
            path: 'edit/:id', // <-- NUEVA RUTA: El ':id' es una variable dinámica
            loadComponent: () =>
              import('./features/products/pages/product-create/product-create').then(
                (m) => m.ProductCreate,
              ),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
