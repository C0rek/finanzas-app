import { HttpResourceRef } from '@angular/common/http';
import { effect, inject, Injectable, signal, untracked } from '@angular/core';
import { MovimientosService } from './movimientos.service';
import { PatrimonioService } from './patrimonio.service';

// Lo mínimo que gira el ícono: si la API responde en 50 ms, el giro no llega a verse
// y parece que el botón no hizo nada.
const GIRO_MINIMO_MS = 600;

// Botón "Sincronizar": vuelve a pedir a la base todos los datos de la app (tarjetas del
// dashboard, movimientos y posiciones), estén o no en pantalla.
// Se crea al levantar la app (ver app.config.ts): la primera carga cuenta como sincronización.
@Injectable({ providedIn: 'root' })
export class SincronizacionService {
  private readonly recursos: HttpResourceRef<unknown>[];
  private inicio = Date.now();

  // Arranca en true: los recursos ya empezaron a cargar al crearse los servicios.
  readonly sincronizando = signal(true);
  // Hora de la última sincronización terminada (null = todavía no terminó la primera).
  readonly ultima = signal<Date | null>(null);

  constructor() {
    const patrimonio = inject(PatrimonioService);
    this.recursos = [
      patrimonio.patrimonio(),
      patrimonio.posiciones(),
      patrimonio.evolucion(),
      patrimonio.exposicionBtc(),
      inject(MovimientosService).movimientos(),
    ];

    // Mira los recursos mientras se sincroniza: cuando ninguno sigue cargando, termina.
    effect(() => {
      if (!this.sincronizando()) return;
      if (this.recursos.some((r) => r.isLoading())) return;
      const resto = Math.max(0, GIRO_MINIMO_MS - (Date.now() - this.inicio));
      setTimeout(() => untracked(() => this.terminar()), resto);
    });
  }

  sincronizar(): void {
    // Un segundo click mientras gira no hace nada: evita pedir todo dos veces.
    if (this.sincronizando()) return;
    this.inicio = Date.now();
    for (const r of this.recursos) r.reload();
    this.sincronizando.set(true);
  }

  private terminar(): void {
    if (!this.sincronizando()) return;
    this.sincronizando.set(false);
    this.ultima.set(new Date());
  }
}
