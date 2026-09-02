import { Component, computed, inject } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';
import { RouterModule } from '@angular/router';

export interface RankedProductItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: string;
  imageUrl?: string;
  currentStock: number;
  unitsSold: number;      // Métrica calculada
  revenueGenerated: number; // Ingresos generados
}

@Component({
  selector: 'app-product-ranking',
  standalone: true,
  imports: [RouterModule], // Control flow nativo de Angular (@if, @for)
  templateUrl: './product-ranking.html'
})
export class ProductRankingComponent {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);

  // Señales vivas conectadas a internet (Supabase)
  readonly products = this.productRepo.getProducts();
  readonly sales = this.posRepo.getSales();

  // 📊 MOTOR INTELIGENTE: Genera el top de rotación de stock de mayor a menor
  readonly rankedProducts = computed<RankedProductItem[]>(() => {
    const productList = this.products();
    const invoiceList = this.sales();

    // Mapeamos los productos base y preparamos sus acumuladores
    const rankedList: RankedProductItem[] = productList.map(prod => {
      let totalUnitsSold = 0;

      // Recorremos el historial de boletas para contar cuántas veces se compró este artículo
      invoiceList.forEach(invoice => {
        invoice.items.forEach(item => {
          if (item.product.id === prod.id) {
            totalUnitsSold += item.quantity;
          }
        });
      });

      const cleanPrice = Number(prod.price.replace(/[^0-9]/g, '')) || 0;
      const totalRevenue = totalUnitsSold * cleanPrice;

      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        price: prod.price,
        imageUrl: prod.imageurl,
        currentStock: prod.stock,
        unitsSold: totalUnitsSold,
        revenueGenerated: totalRevenue
      };
    });

    // 📌 ORDENACIÓN ALGORÍTMICA: De mayor a menor venta (Sort Descendente)
    return rankedList.sort((a, b) => b.unitsSold - a.unitsSold);
  });

  // Captura el récord de unidades del producto número 1 para ponderar las barras de progreso del HTML
  readonly maxUnitsSold = computed(() => {
    const list = this.rankedProducts();
    return list.length > 0 ? list[0].unitsSold : 1;
  });

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
