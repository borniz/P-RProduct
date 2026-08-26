import { Component, signal } from '@angular/core';

// Interfaz estricta para asegurar el tipado correcto de los indicadores clave
interface KPI {
  title: string;
  value: string;
  subtext: string;
  trend?: string;
  type: 'info' | 'success' | 'warning' | 'purple';
}

// Interfaz corporativa para el control de stock de la ferretería
interface InventoryProduct {
  name: string;
  category: string;
  stock: number;
  minStock: number;
  status: 'Óptimo' | 'Bajo' | 'Crítico';
  price: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [], // No requiere CommonModule, el flujo de control nativo maneja todo en la plantilla
  templateUrl: './dashboard.html'
})
export class Dashboard {
  // Canales reactivos para las tarjetas de métricas del ERP
  readonly kpis = signal<KPI[]>([
    { title: 'Ventas del mes', value: '$ 45.750.000', subtext: 'vs mes anterior', trend: '+ 12.5%', type: 'info' },
    { title: 'Productos', value: '1.248', subtext: 'Activos en catálogo', type: 'success' },
    { title: 'Stock bajo', value: '23', subtext: 'Artículos en alerta', type: 'warning' },
    { title: 'Proveedores', value: '56', subtext: 'Cuentas activas', type: 'purple' }
  ]);

  // Colección reactiva para los artículos destacados en pantalla
  readonly inventoryDestacado = signal<InventoryProduct[]>([
    { name: 'Taladro Percutor 750W', category: 'Herramientas eléctricas', stock: 85, minStock: 15, status: 'Óptimo', price: '$ 89.900' },
    { name: 'Tornillo Para Madera 1" (x100)', category: 'Fijaciones', stock: 120, minStock: 50, status: 'Óptimo', price: '$ 2.450' },
    { name: 'Juego de Llaves Mixtas', category: 'Herramientas manuales', stock: 22, minStock: 25, status: 'Bajo', price: '$ 34.900' },
    { name: 'Broca Concreto 8mm', category: 'Accesorios', stock: 4, minStock: 20, status: 'Crítico', price: '$ 1.250' },
    { name: 'Esmeril Angular 4 1/2"', category: 'Herramientas eléctricas', stock: 40, minStock: 10, status: 'Óptimo', price: '$ 45.900' }
  ]);
}
