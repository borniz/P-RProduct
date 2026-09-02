import { Component, computed, inject, signal, OnInit } from '@angular/core'; // 📌 Importado OnInit
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common'; // 📌 Importado para soporte de pipes en el HTML si es necesario

export interface RankedProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  imageUrl?: string;
  currentStock: number;
  unitsSold: number;      
  revenueGenerated: number; 
}

@Component({
  selector: 'app-product-ranking',
  standalone: true,
  imports: [RouterModule, CommonModule], 
  templateUrl: './product-ranking.html'
})
export class ProductRankingComponent implements OnInit { // 📌 Implementa OnInit para refresco al abrir
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);

  // Señales vivas conectadas a internet (Supabase)
  readonly products = this.productRepo.getProducts();
  readonly sales = this.posRepo.getSales();

  // Filtro de búsqueda en caliente para la UI
  readonly searchQuery = signal<string>('');

  // 🚀 REFRESCAR AL ABRIR LA VISTA: Sincroniza las boletas de Supabase de forma elástica
  ngOnInit(): void {
    if (typeof (this.productRepo as any).load === 'function') (this.productRepo as any).load();
    if (typeof (this.posRepo as any).load === 'function') (this.posRepo as any).load();
  }

  // 📊 MOTOR INTELIGENTE: Genera el top de rotación de stock de mayor a menor
  readonly rankedProducts = computed<RankedProductItem[]>(() => {
    const productList = this.products();
    const invoiceList = this.sales();
    const query = this.searchQuery().toLowerCase().trim();

    // 1. Mapeamos primero el volumen de unidades vendidas indexadas por el ID de producto
    const qtyByProductId: { [id: string]: number } = {};

    invoiceList.forEach((invoice: any) => {
      // 📌 REPARACIÓN: Leemos la columna mapeada real del repositorio
      const rawItems = invoice.itemsSnapshot || invoice.items_snapshot || invoice.items;
      if (!rawItems) return;

      let items: any[] = [];
      // Deserializamos el string JSONB que viene de la base de datos de Postgres
      if (typeof rawItems === 'string') {
        try { 
          items = JSON.parse(rawItems); 
        } catch (e) { 
          return; 
        }
      } else if (Array.isArray(rawItems)) {
        items = rawItems;
      }

      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const pId = item.product?.id || item.id || item.product_id;
          const qty = Number(item.quantity || item.cantidad || item.qty || 0);
          
          if (pId && qty > 0) {
            qtyByProductId[pId] = (qtyByProductId[pId] || 0) + qty;
          }
        });
      }
    });

    // 2. Construimos la lista final del ranking cruzando el catálogo contra el mapa de cantidades
    const rankedList: RankedProductItem[] = productList.map(prod => {
      // Buscamos las unidades vendidas usando el ID único como llave de máxima seguridad
      const totalUnitsSold = qtyByProductId[prod.id] || 0;

      // Sanitiza el precio removiendo signos o puntos por si viene formateado como texto ($)
      const cleanPrice = typeof prod.price === 'number' 
        ? prod.price 
        : (Number(String(prod.price || '').replace(/[^0-9]/g, '')) || 0);
        
      const totalRevenue = totalUnitsSold * cleanPrice;

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        price: String(prod.price),
        imageUrl: prod.imageurl,
        currentStock: prod.stock,
        unitsSold: totalUnitsSold,
        revenueGenerated: totalRevenue
      };
    });

    // 3. Filtrado por buscador y ordenación elástica de mayor a menor venta
    return rankedList
      .filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
      .sort((a, b) => b.unitsSold - a.unitsSold);
  });

  // Captura el récord de unidades del producto número 1 para ponderar las barras de progreso del HTML
  readonly maxUnitsSold = computed(() => {
    const list = this.rankedProducts();
    return list.length > 0 ? list[0].unitsSold : 1;
  });

  updateSearch(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
