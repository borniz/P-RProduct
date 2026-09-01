import { Component, inject } from '@angular/core';
import { GenericListComponent } from '../../../shared/pages/generic-list/generic-list';
import { ModuleMetadata,  GenericUnitItem } from '../../../shared/models/generic-inventory.model';
import { UNIT_REPOSITORY } from '../../data-access/unit.repository';

@Component({
  selector: 'app-unit-list',
  standalone: true,
  imports: [GenericListComponent],
  template: `
    <app-generic-list [metadata]="unitMetadata" [items]="units()" (itemAdded)="onAdd($event)" (itemUpdated)="onUpdate($event)"></app-generic-list>
  `
})
export class UnitListComponent {
  private readonly unitRepo = inject(UNIT_REPOSITORY);
  readonly units = this.unitRepo.getUnits();

  readonly unitMetadata: ModuleMetadata = {
    entityName: 'Unidad',
    pluralName: 'Unidades de Medida',
    subtitle: 'Unidades de fraccionamiento estándar para auditorías y cubicaciones',
    metricLabel: 'Existencias Indexadas',
    hasDescription: false, // Desactiva dinámicamente la columna descripción para este submódulo
    descriptionPlaceholder: ''
  };

  onAdd(item: GenericUnitItem): void { 
    this.unitRepo.addUnit(item); 
    console.log(item)
  }
  onUpdate(item: GenericUnitItem): void { this.unitRepo.updateUnit(item);alert(`las unidades que entran son ${item}`) }
}
