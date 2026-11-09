import { HttpResourceRef } from '@angular/common/http';
import { DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';

// Lo mínimo que gira el ícono: si la API responde en 50 ms, el giro no llega a verse
// y parece que el botón no hizo nada.
const GIRO_MINIMO_MS = 600;

// Botón "Sincronizar": vuelve a pedir al back todos los datos que hay en pantalla.
// Cada card registra su recurso con sincronizable(); el servicio los recarga juntos
// y avisa cuándo terminaron todos.
@Injectable({ providedIn: 'root' })
export class SincronizacionService {
  private readonly recursos = signal<HttpResourceRef<unknown>[]>([]);
  private inicio = 0;

  readonly sincronizando = signal(false);
  // Hora de la última sincronización terminada (null = todavía no se sincronizó).
  readonly ultima = signal<Date | null>(null);

  constructor() {
    // Mira los recursos mientras se sincroniza: cuando ninguno sigue cargando, termina.
    effect(() => {
      if (!this.sincronizando()) return;
      if (this.recursos().some((r) => r.isLoading())) return;
      const resto = Math.max(0, GIRO_MINIMO_MS - (Date.now() - this.inicio));
      setTimeout(() => untracked(() => this.terminar()), resto);
    });
  }

  sincronizar(): void {
    // Un segundo click mientras gira no hace nada: evita pedir todo dos veces.
    if (this.sincronizando()) return;
    this.inicio = Date.now();
    for (const r of this.recursos()) r.reload();
    this.sincronizando.set(true);
  }

  registrar(recurso: HttpResourceRef<unknown>): () => void {
    this.recursos.update((lista) => [...lista, recurso]);
    return () => this.recursos.update((lista) => lista.filter((r) => r !== recurso));
  }

  private terminar(): void {
    if (!this.sincronizando()) return;
    this.sincronizando.set(false);
    this.ultima.set(new Date());
  }
}

// Se usa al crear el recurso de una card:
//   protected readonly recurso = sincronizable(inject(PatrimonioService).consultar());
// Cuando la card se destruye (cambio de página), el recurso se da de baja solo.
export function sincronizable<T extends HttpResourceRef<unknown>>(recurso: T): T {
  const baja = inject(SincronizacionService).registrar(recurso);
  inject(DestroyRef).onDestroy(baja);
  return recurso;
}
