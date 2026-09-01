import { Injectable, Signal, signal } from "@angular/core";
import { GenericInventoryItem } from "../../inventory/shared/models/generic-inventory.model";
import { SupplierRepository } from "./supplier.repository";

@Injectable({providedIn:'root'})
export class SupabaseSupplierRepository implements SupplierRepository{
    private readonly _suppliers = signal<GenericInventoryItem[]>([
    { id: '1', name: 'Distribuidora Central Ferretera S.A.', code: 'PROV-DCF01', description: 'Proveedor mayorista de herramientas eléctricas Bosch y Makita. Contacto: contacto@dcf.cl', metricCount: 2, isActive: true },
    { id: '2', name: 'Importadora de Aceros del Norte', code: 'PROV-IAN05', description: 'Suministro de tornillería pesada, pernos estructurales y fijaciones.', metricCount: 1, isActive: true },
    { id: '3', name: 'Químicos y Pinturas del Pacífico', code: 'PROV-QPP02', description: 'Distribuidor exclusivo de esmaltes sintéticos, látex y diluyentes industriales.', metricCount: 1, isActive: true }
  ]);

  getSuppliers(): Signal<GenericInventoryItem[]> {
      return this._suppliers.asReadonly();
  }
  addSuppliers(item: GenericInventoryItem): void {
      this._suppliers.update(current => [item,...current])
  }

  updateSuppliers(item: GenericInventoryItem): void {
      this._suppliers.update(current => current.map(s => s.id === item.id? item:s))
  }
}