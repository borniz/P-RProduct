import { InjectionToken, Signal } from "@angular/core";
import { GenericInventoryItem } from "../../inventory/shared/models/generic-inventory.model";


export interface SupplierRepository{
    getSuppliers(): Signal<GenericInventoryItem[]>;
    addSuppliers(suppliers:GenericInventoryItem):void;
    updateSuppliers(suppliers:GenericInventoryItem):void;

}

export const SUPPLIER_REPOSITORY = new InjectionToken<SupplierRepository>('SupplierRepository')
