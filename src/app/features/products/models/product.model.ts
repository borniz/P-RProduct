export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;        
  unit: string;         
  stock: number;
  minStock: number;
  status: 'Óptimo' | 'Bajo' | 'Crítico';
  buyPrice: string;
  price: string;
  imageUrl?: string;
}