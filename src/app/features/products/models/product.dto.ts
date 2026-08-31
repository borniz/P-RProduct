export interface ProductDto {
  id:string;
  sku_id: string;
  product_name: string;
  category_name: string;
  current_stock: number;
  minimum_stock: number;
  inventory_status: 'Óptimo' | 'Bajo' | 'Crítico';
  buyPrice:string;
  unit_price: string;
  imageUrl?:string;
}
