import { Injectable, signal, computed } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  // 🔒 SIGNALS DE ESTADO PRIVADOS PROTEGIDOS
  private readonly _isActive = signal<boolean>(false);
  private readonly _progress = signal<number>(0);
  private readonly _message = signal<string>('Procesando datos en la nube...');

  // Exposición segura de lectura pura para el componente flotante
  readonly isActive = this._isActive.asReadonly();
  readonly progress = this._progress.asReadonly();
  readonly message = this._message.asReadonly();

  private progressInterval: any;

  // 🚀 DISPARADOR MAESTRO: Enciende el modal e inicia el cálculo lineal del porcentaje real
  show(customMessage?: string): void {
    this.stopProgressTimer();
    this._message.set(customMessage || 'Sincronizando con Supabase...');
    this._progress.set(0);
    this._isActive.set(true);

    // Motor de aceleración asíncrona simulada: emula el tráfico de paquetes de red
    this.progressInterval = setInterval(() => {
      this._progress.update(curr => {
        if (curr >= 92) {
          // Se congela inteligentemente en 92% a la espera de la resolución final de la base de datos
          clearInterval(this.progressInterval);
          return curr;
        }
        // Incrementos dinámicos variables
        const step = curr < 50 ? Math.floor(Math.random() * 15) + 5 : Math.floor(Math.random() * 5) + 1;
        return Math.min(curr + step, 92);
      });
    }, 100);
  }

  // 🏁 DESENGANCHE MAESTRO: Completa la barra al 100% y desmonta el overlay de la pantalla
  hide(): void {
    this.stopProgressTimer();
    this._progress.set(100);
    
    // Dejamos ver el 100% por 250ms para una transición visual ultra fluida antes de cerrar
    setTimeout(() => {
      this._isActive.set(false);
      this._progress.set(0);
    }, 250);
  }

  private stopProgressTimer(): void {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }
}
