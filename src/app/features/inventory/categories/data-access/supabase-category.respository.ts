import { Injectable, signal, Signal } from '@angular/core';
import { CategoryRepository } from './category.repository';
import { GenericInventoryItem } from '../../shared/models/generic-inventory.model';

@Injectable({ providedIn: 'root' })
export class SupabaseCategoryRepository implements CategoryRepository {
  private readonly _categories = signal<GenericInventoryItem[]>([
    { id: '1', name: 'Herramientas eléctricas', code: 'INV-HELE', description: 'Rotomartillos, esmeriles y taladros', metricCount: 45, isActive: true },
    { id: '2', name: 'Fijaciones', code: 'INV-FIJA', description: 'Tornillería pesada y pernos de anclaje', metricCount: 140, isActive: true },
    { id: '3', name: 'Herramientas manuales', code: 'INV-HMAN', description: 'Llaves ajustables, alicates y martillos', metricCount: 18, isActive: true }
  ]);

  getCategories(): Signal<GenericInventoryItem[]> { return this._categories.asReadonly(); }
  addCategory(item: GenericInventoryItem): void { this._categories.update(curr => [item, ...curr]); }
  updateCategory(item: GenericInventoryItem): void {
    this._categories.update(curr => curr.map(c => c.id === item.id ? item : c));
  }
}
