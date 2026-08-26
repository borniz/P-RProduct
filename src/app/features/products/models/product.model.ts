export interface Product {
  sku: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  status: 'Óptimo' | 'Bajo' | 'Crítico';
  price: string;
}
