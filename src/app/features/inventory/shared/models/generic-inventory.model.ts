export interface GenericInventoryItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  metricCount?: number;
  isActive: boolean;
}
export interface GenericUnitItem{
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

// 📌 NUEVO DTO UNIFICADO PARA POSTGRESQL
export interface GenericDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  metric_count: number;
  is_active: boolean;
}

export interface ModuleMetadata {
  entityName: string;
  pluralName: string;
  subtitle: string;
  metricLabel: string;
  hasDescription: boolean;
  descriptionPlaceholder: string;
}
