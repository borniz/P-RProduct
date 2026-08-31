import { InjectionToken, Signal } from '@angular/core';
import { Product } from '../models/product.model';

export interface ProductRepository {
  getProducts(): Signal<Product[]>;
  addProduct(product: Product): void;
  updateProduct(product: Product): void;
}

export const PRODUCT_REPOSITORY = new InjectionToken<ProductRepository>('ProductRepository');
