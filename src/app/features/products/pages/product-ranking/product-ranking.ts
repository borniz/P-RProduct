import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../data-access/product.repository';
import { POS_REPOSITORY } from '../../../pos/data-acces/pos.repository';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { LoadingService } from '../../../../core/services/loading.service'; // 📌 INYECTADO SERVICIO GLOBAL

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
export class ProductRankingComponent implements OnInit {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  private readonly posRepo = inject(POS_REPOSITORY);
  private readonly loadingService = inject(LoadingService); // 📌 Inyección funcional de carga

  readonly products = this.productRepo.getProducts();
  readonly sales = this.posRepo.getSales();
  readonly searchQuery = signal<string>('');

  // 🚀 REFRESCAR AL ABRIR: Muestra la barra de carga elástica real mientras procesa las boletas remótas
  async ngOnInit(): Promise<void> {
    this.loadingService.show('Analizando rotación de stock e historial de facturación POS...');
    
    try {
      const promesas: Promise<void>[] = [];
      if (typeof (this.productRepo as any).load === 'function') promesas.push((this.productRepo as any).load());
      if (typeof (this.posRepo as any).load === 'function') promesas.push((this.posRepo as any).load());
      
      if (promesas.length > 0) {
        await Promise.all(promesas);
      }
      this.loadingService.hide(); // 100% fluido al completar
    } catch (e) {
      this.loadingService.hide();
    }
  }

  // 📊 MOTOR INTELIGENTE: Genera el top de rotación de stock cruzando arreglos JSONB
  readonly rankedProducts = computed<RankedProductItem[]>(() => {
    const productList = this.products();
    const invoiceList = this.sales();
    const query = this.searchQuery().toLowerCase().trim();
    const qtyByProductId: { [id: string]: number } = {};

    invoiceList.forEach((invoice: any) => {
      const rawItems = invoice.itemsSnapshot || invoice.items_snapshot || invoice.items;
      if (!rawItems) return;

      let items: any[] = [];
      if (typeof rawItems === 'string') {
        try { items = JSON.parse(rawItems); } catch (e) { return; }
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

    const rankedList: RankedProductItem[] = productList.map(prod => {
      const totalUnitsSold = qtyByProductId[prod.id] || 0;
      const cleanPrice = typeof prod.price === 'number' 
        ? prod.price 
        : (Number(String(prod.price || '').replace(/[^0-9]/g, '')) || 0);
      const totalRevenue = totalUnitsSold * cleanPrice;

      return {
        id: prod.id, sku: prod.sku, name: prod.name, category: prod.category,
        price: String(prod.price), imageUrl: prod.imageurl, currentStock: prod.stock,
        unitsSold: totalUnitsSold, revenueGenerated: totalRevenue
      };
    });

    return rankedList
      .filter(p => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query))
      .sort((a, b) => b.unitsSold - a.unitsSold);
  });

  // Captura el récord del primer lugar para ponderar las barras horizontales del HTML
  readonly maxUnitsSold = computed(() => {
    const list = this.rankedProducts();
    return list.length > 0 ? list[0].unitsSold : 1;
  });

  updateSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
  }
}
