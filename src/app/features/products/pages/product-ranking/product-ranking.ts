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
  // 📊 MOTOR OPTIMIZADO: Reduce el Main-Thread Work aplicando mapas hash de tiempo lineal O(N)
  readonly rankedProducts = computed<RankedProductItem[]>(() => {
    const productList = this.products();
    const invoiceList = this.sales();
    const query = this.searchQuery().toLowerCase().trim();
    
    // Diccionario hash optimizado para sumas directas de alta velocidad
    const qtyByProductId = new Map<string, number>();

    // 1. Recorremos el historial de facturación de forma plana una sola vez
    for (let i = 0; i < invoiceList.length; i++) {
      const invoice = invoiceList[i];
      const rawItems =  invoice.items;
      if (!rawItems) continue;

      let items: any[] = [];
      if (typeof rawItems === 'string') {
        try { 
          items = JSON.parse(rawItems); 
        } catch (e) { 
          continue; 
        }
      } else if (Array.isArray(rawItems)) {
        items = rawItems;
      }

      // Sumatoria directa sobre la referencia en memoria RAM
      for (let j = 0; j < items.length; j++) {
        const item = items[j];
        const pId = item.product?.id || item.id || item.product_id;
        const qty = Number(item.quantity || item.cantidad || item.qty || 0);
        
        if (pId && qty > 0) {
          qtyByProductId.set(pId, (qtyByProductId.get(pId) || 0) + qty);
        }
      }
    }

    // 2. Construimos la lista cruzando el catálogo contra el mapa compilado
    const rankedList: RankedProductItem[] = productList.map(prod => {
      const totalUnitsSold = qtyByProductId.get(prod.id) || 0;
      const cleanPrice = typeof prod.price === 'number' 
        ? prod.price 
        : (Number(String(prod.price || '').replace(/[^0-9]/g, '')) || 0);
        
      return {
        id: prod.id,
        sku: prod.sku,
        name: prod.name,
        category: prod.category,
        price: String(prod.price),
        imageUrl: prod.imageurl,
        currentStock: prod.stock,
        unitsSold: totalUnitsSold,
        revenueGenerated: totalUnitsSold * cleanPrice
      };
    });

    // 3. Filtrado predictivo por buscador de mostrador
    const filtered = rankedList.filter(p => 
      p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query)
    );

    // 4. Ordenación elástica de mayor a menor volumen comercial
    filtered.sort((a, b) => b.unitsSold - a.unitsSold);

    // 🚀 REDUCCIÓN DE PAYLOAD: Si no hay filtro de texto, solo expone el TOP 15 inicial.
    // Esto minimiza layouts pesados en cascada y destraba los diagnósticos de Lighthouse
    return query ? filtered : filtered.slice(0, 15);
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
