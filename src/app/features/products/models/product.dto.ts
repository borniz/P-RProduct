export interface ProductDto {
  id: string;
  sku_id: string | null;
  product_name: string;
  category_name: string;
  brand_name?: string;      
  unit_name?: string;     
  current_stock: number;
  minimum_stock: number;
  inventory_status: 'Óptimo' | 'Bajo' | 'Crítico';
  buyPrice: string;
  unit_price: string;
  imageUrl?: string;
}