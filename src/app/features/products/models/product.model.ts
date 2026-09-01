export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  unit: string;
  supplier: string;    
  stock: number;
  minStock: number;
  status: 'Óptimo' | 'Bajo' | 'Crítico';
  buyprice: string;
  price: string;
  imageurl?: string;
}
