import { Component, input, output, signal, computed, OnInit } from '@angular/core';
import { GenericInventoryItem, ModuleMetadata } from '../../models/generic-inventory.model';

@Component({
  selector: 'app-generic-form-modal',
  standalone: true,
  templateUrl: './generic-form-modal.html'
})
export class GenericFormModalComponent implements OnInit {
  // Canales de comunicación estrictamente tipados de Angular v22
  readonly metadata = input.required<ModuleMetadata>();
  readonly itemToEdit = input<GenericInventoryItem | null>(null);

  readonly closeForm = output<void>();
  readonly saveItem = output<GenericInventoryItem>();

  // Signals de Control para los Inputs (Manejados de forma ligera y reactiva)
  readonly code = signal<string>('');
  readonly name = signal<string>('');
  readonly description = signal<string>('');
  readonly errorMessage = signal<string>('');

  // Señales Computadas (Computed) Duales Inteligentes
  readonly isEditMode = computed(() => this.itemToEdit() !== null);
  readonly modalTitle = computed(() => this.isEditMode() ? `Actualizar ${this.metadata().entityName}` : `Nueva ${this.metadata().entityName}`);
  readonly submitButtonText = computed(() => this.isEditMode() ? 'Guardar Cambios' : 'Registrar Lote');

  ngOnInit(): void {
    const item = this.itemToEdit();
    if (item) {
      // Precarga dinámica en cascada si estamos en modo edición
      this.code.set(item.code);
      this.name.set(item.name);
      this.description.set(item.description || '');
    }
  }

  // Manejadores unificados de tipeo manual
  onInputCode(e: Event): void { this.code.set((e.target as HTMLInputElement).value.toUpperCase()); }
  onInputName(e: Event): void { this.name.set((e.target as HTMLInputElement).value); }
  onInputDesc(e: Event): void { this.description.set((e.target as HTMLTextAreaElement).value); }

  onSubmit(event: Event): void {
    event.preventDefault();

    if (!this.name().trim() || !this.code().trim()) {
      this.errorMessage.set(`El nombre de la ${this.metadata().entityName} y su código identificador son estrictamente obligatorios.`);
      return;
    }

    const payload: GenericInventoryItem = {
      id: this.isEditMode() ? this.itemToEdit()!.id : crypto.randomUUID(),
      code: this.code().trim(),
      name: this.name().trim(),
      description: this.metadata().hasDescription ? this.description().trim() : undefined,
      metricCount: this.isEditMode() ? this.itemToEdit()!.metricCount : 0,
      isActive: true
    };
    this.saveItem.emit(payload);
  }
}
