import { Routes } from '@angular/router';
import { AppShell } from './core/layout/app-shell/app-shell';
import { CATEGORY_REPOSITORY } from './features/inventory/categories/data-access/category.repository';
import { SupabaseBrandRepository } from './features/inventory/brands/data-access/supabase-brand.repository';
import { UNIT_REPOSITORY } from './features/inventory/units/data-access/unit.repository';
import { SupabaseUnitRepository } from './features/inventory/units/data-access/supabase-unit.repository';
import { SupabaseCategoryRepository } from './features/inventory/categories/data-access/supabase-category.respository';
import { BRAND_REPOSITORY } from './features/inventory/brands/data-access/brands.repository';
import { STOCK_REPOSITORY } from './features/inventory/stock/data-access/stock.repository';
import { SupabaseStockRepository } from './features/inventory/stock/data-access/supabase-stock.repository';
import { SUPPLIER_REPOSITORY } from './features/suppliers/data-access/supplier.repository';
import { SupabaseSupplierRepository } from './features/suppliers/data-access/supabase-supplier.repository';
import { POS_REPOSITORY } from './features/pos/data-acces/pos.repository';
import { SupabasePosRepository } from './features/pos/data-acces/supabase-pos.repository';
import { SupabaseCashClosureRepository } from './features/finances/data-access/supabase-cash-closure.repository';
import { CASH_CLOSURE_REPOSITORY } from './features/finances/data-access/cash-closure.repository';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: 'dashboard',
        providers: [
          { provide: STOCK_REPOSITORY, useClass: SupabaseStockRepository },
          { provide: POS_REPOSITORY, useClass: SupabasePosRepository },
        ],
        loadComponent: () =>
          import('./features/dashboard/dashboard').then((m) => m.DashboardComponent),
      },
      // Importa las referencias que falten en las cabeceras de tu app.routes.ts:

      // Reemplaza el segmento 'products' en tu enrutador:
      {
        path: 'products',
        providers: [
          { provide: CATEGORY_REPOSITORY, useClass: SupabaseCategoryRepository },
          { provide: BRAND_REPOSITORY, useClass: SupabaseBrandRepository }, // <-- NUEVO PROVEEDOR
          { provide: UNIT_REPOSITORY, useClass: SupabaseUnitRepository },
          { provide: SUPPLIER_REPOSITORY, useClass: SupabaseSupplierRepository },
          { provide:POS_REPOSITORY,useClass:SupabasePosRepository} // <-- NUEVO PROVEEDOR
        ],
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
          {
            path: 'ranking',
            loadComponent: () =>
              import('./features/products/pages/product-ranking/product-ranking').then(
                (m) => m.ProductRankingComponent,
              ),
          },
        ],
      },
      // 📌 NUEVAS RUTAS DE SUBMÓDULOS CONECTADOS AL MOTOR GENÉRICO
      {
        path: 'inventory/categories',
        providers: [{ provide: CATEGORY_REPOSITORY, useClass: SupabaseCategoryRepository }],
        loadComponent: () =>
          import('./features/inventory/categories/pages/category-list/category-list').then(
            (m) => m.CategoryListComponent,
          ),
      },
      {
        path: 'inventory/brands',
        providers: [{ provide: BRAND_REPOSITORY, useClass: SupabaseBrandRepository }],
        loadComponent: () =>
          import('./features/inventory/brands/pages/brand-list/brand-list').then(
            (m) => m.BrandListComponent,
          ),
      },
      {
        path: 'inventory/units',
        providers: [{ provide: UNIT_REPOSITORY, useClass: SupabaseUnitRepository }],
        loadComponent: () =>
          import('./features/inventory/units/pages/unit-list/unit-list').then(
            (m) => m.UnitListComponent,
          ),
      },
      {
        path: 'inventorymov',
        providers: [{ provide: STOCK_REPOSITORY, useClass: SupabaseStockRepository }],
        loadComponent: () =>
          import('./features/inventory/stock/pages/stock-list/stock-list').then((m) => m.StockList),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings').then((m) => m.SettingsComponent),
      },
      {
        path: 'pos',
        providers: [{ provide: POS_REPOSITORY, useClass: SupabasePosRepository }],
        loadComponent: () =>
          import('./features/pos/pages/pos-terminal.ts/pos-terminal').then(
            (m) => m.PosTerminalComponent,
          ),
      },
      {
        path: 'inventory/finances',
        providers: [
          { provide: CASH_CLOSURE_REPOSITORY, useClass: SupabaseCashClosureRepository },
          { provide: POS_REPOSITORY, useClass: SupabasePosRepository },
        ],
        loadComponent: () =>
          import('./features/finances/pages/audit-panel/audit-panel').then(
            (m) => m.AuditPanelComponent,
          ),
      },
      {
        path: 'suppliers',
        providers: [{ provide: SUPPLIER_REPOSITORY, useClass: SupabaseSupplierRepository }],
        loadComponent: () =>
          import('./features/suppliers/pages/supplier-list/suppliers').then(
            (m) => m.SupplierListComponent,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
