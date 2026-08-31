import { Injectable, signal, Signal } from '@angular/core';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';
import { BrandRepository } from './brands.repository';

@Injectable({ providedIn: 'root' })
export class SupabaseBrandRepository implements BrandRepository {
  private readonly _brands = signal<GenericInventoryItem[]>([
    { id: '1', name: 'Bosch Professional', code: 'BR-BOSCH', description: 'Maquinaria pesada alemana de alta gama', metricCount: 12, isActive: true },
    { id: '2', name: 'Stanley Tools', code: 'BR-STANL', description: 'Herramientas manuales de alta rotación americana', metricCount: 8, isActive: true },
    { id: '3', name: 'Makita Power', code: 'BR-MAKIT', description: 'Tecnología japonesa en baterías de litio', metricCount: 15, isActive: true }
  ]);

  getBrands(): Signal<GenericInventoryItem[]> { return this._brands.asReadonly(); }
  addBrand(item: GenericInventoryItem): void { this._brands.update(curr => [item, ...curr]); }
  updateBrand(item: GenericInventoryItem): void {
    this._brands.update(curr => curr.map(b => b.id === item.id ? item : b));
  }
}
