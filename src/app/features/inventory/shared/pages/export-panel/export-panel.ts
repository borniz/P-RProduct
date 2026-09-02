import { Component, inject, computed } from '@angular/core';
import { PRODUCT_REPOSITORY } from '../../../../products/data-access/product.repository';

@Component({
  selector: 'app-export-panel',
  standalone: true,
  imports: [], // Control flow nativo de Angular v22
  templateUrl: './export-panel.html'
})
export class ExportPanelComponent {
  private readonly productRepo = inject(PRODUCT_REPOSITORY);
  
  // Conexión directa a las existencias vivas de Supabase
  readonly products = this.productRepo.getProducts();

  // Métricas rápidas de empaquetado computadas para el control de inventario
  readonly totalSku = computed(() => this.products().length);
  readonly alertsCount = computed(() => this.products().filter(p => p.status !== 'Óptimo').length);

  // 🚀 GENERADOR Y DESCARGADOR CSV/EXCEL NATIVO
  exportToCsv(): void {
    const data = this.products();
    if (data.length === 0) return;

    // 1. Definimos las cabeceras de las columnas del reporte contable
    const headers = ['ID,SKU,PRODUCTO,CATEGORIA,MARCA,UNIDAD,PROVEEDOR,STOCK,MIN_STOCK,ESTADO,PRECIO_COMPRA,PRECIO_VENTA'];
    
    // 2. Mapeamos las filas del catálogo de Supabase sanitizando comas y saltos de línea
    const rows = data.map(p => [
      p.id,
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category,
      p.brand,
      p.unit,
      p.supplier || 'Sin Proveedor',
      p.stock,
      p.minStock,
      p.status,
      p.buyprice.replace(/[^0-9]/g, ''),
      p.price.replace(/[^0-9]/g, '')
    ].join(','));

    // 3. Consolidamos el blob de texto binario con codificación UTF-8
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 4. Gatillamos la descarga elástica en el navegador del operador
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_inventario_brsolutions_${new Date().toISOString().substring(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // 🚀 GENERADOR DE INFORME PDF CORPORATIVO
  exportToPdf(): void {
    // Gatilla la orden nativa de impresión del sistema operativo
    window.print();
  }
}
