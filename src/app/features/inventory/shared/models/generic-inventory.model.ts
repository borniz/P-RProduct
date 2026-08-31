export interface GenericInventoryItem {
  id: string;
  code: string;        // Código Identificador (Ej: INV-HELE, MC-BOSCH, UN-KG)
  name: string;        // Nombre comercial
  description?: string; // Detalle u origen corporativo
  metricCount?: number; // Contador dinámico (Muestra 'Productos', 'Proveedores' o queda oculto)
  isActive: boolean;
}

// Configuración de metadatos para que el componente genérico sepa qué textos imprimir
export interface ModuleMetadata {
  entityName: string;       // Ej: 'Categoría', 'Marca', 'Unidad de Medida'
  pluralName: string;       // Ej: 'Categorías', 'Marcas', 'Unidades de Medida'
  subtitle: string;         // Descripción operativa del encabezado
  metricLabel: string;      // Nombre de la columna de control (Ej: 'Productos Vinculados')
  hasDescription: boolean;  // Interruptor para ocultar o mostrar el campo de texto largo
  descriptionPlaceholder: string; // Marcador del área de texto
}
