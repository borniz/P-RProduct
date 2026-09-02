import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { PRODUCT_REPOSITORY } from './features/products/data-access/product.repository';
import { STOCK_REPOSITORY } from './features/inventory/stock/data-access/stock.repository';
import { SupabaseStockRepository } from './features/inventory/stock/data-access/supabase-stock.repository';
import { SupabaseProductRepository } from './features/products/data-access/supabase-product.repository';


export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: PRODUCT_REPOSITORY, useExisting: SupabaseProductRepository },
    { provide: STOCK_REPOSITORY, useClass: SupabaseStockRepository }
  ]
};
