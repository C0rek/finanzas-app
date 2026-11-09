import { Component, computed, DestroyRef, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import Decimal from 'decimal.js';
import { DecimalTexto } from '../../servicios/modelos';
import { formatearDecimal, OpcionesFormato } from '../formato/formatear-decimal';
import { sinMovimiento } from './pop.directive';

const DURACION_MS = 700;

// Número que "cuenta" desde el valor anterior hasta el nuevo cuando cambia (por ejemplo al
// sincronizar). La primera vez se muestra directo, sin animar.
//   <app-cifra-animada [valor]="p.totalUsd" [opciones]="{ prefijo: 'US$ ' }" />
// Los pasos intermedios se calculan con decimal.js: nunca se pasa el monto por un float.
@Component({
  selector: 'app-cifra-animada',
  template: '{{ texto() }}',
})
export class CifraAnimada {
  readonly valor = input.required<DecimalTexto>();
  readonly opciones = input<OpcionesFormato>({});

  // linkedSignal: sigue a valor(), pero la animación lo puede pisar con los pasos intermedios.
  private readonly mostrado = linkedSignal<DecimalTexto>(() => this.valor());
  protected readonly texto = computed(() => formatearDecimal(this.mostrado(), this.opciones()));

  private anterior: DecimalTexto | null = null;
  private cuadro = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => cancelAnimationFrame(this.cuadro));

    effect(() => {
      const nuevo = this.valor();
      const desde = this.anterior;
      this.anterior = nuevo;
      if (desde === null || desde === nuevo || sinMovimiento()) return;
      untracked(() => this.animar(new Decimal(desde), new Decimal(nuevo)));
    });
  }

  private animar(desde: Decimal, hasta: Decimal): void {
    cancelAnimationFrame(this.cuadro);
    const diferencia = hasta.minus(desde);
    const decimales = Math.max(hasta.decimalPlaces(), desde.decimalPlaces());
    const inicio = performance.now();

    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / DURACION_MS);
      const progreso = 1 - Math.pow(1 - t, 3); // frena al llegar
      const actual = t === 1 ? hasta : desde.plus(diferencia.times(progreso));
      this.mostrado.set(actual.toFixed(decimales));
      if (t < 1) this.cuadro = requestAnimationFrame(paso);
    };
    this.cuadro = requestAnimationFrame(paso);
  }
}
