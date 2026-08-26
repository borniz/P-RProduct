export interface ProductDto {
  sku_id: string;
  product_name: string;
  category_name: string;
  current_stock: number;
  minimum_stock: number;
  inventory_status: 'Óptimo' | 'Bajo' | 'Crítico';
  unit_price: string;
}
