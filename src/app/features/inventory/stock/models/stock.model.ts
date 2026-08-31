export interface StockMovement {
  id: string;
  productName: string;
  type: 'Ingreso' | 'Egreso' | 'Ajuste';
  quantity: number;
  reason: string;      // Ej. 'Compra a proveedor', 'Venta POS', 'Auditoría'
  date: string;
  operator: string;
}
