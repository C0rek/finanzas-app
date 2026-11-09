import { Directive, effect, ElementRef, inject, input } from '@angular/core';

// Hace un pequeño "salto" cuando cambia el valor que se le pasa, pero no al aparecer:
//   <span [appPop]="p.cantidad">{{ p.cantidad }}</span>
// Sirve para que un número que cambió por un filtro se note sin gritar.
@Directive({ selector: '[appPop]' })
export class PopDirective {
  readonly appPop = input.required<unknown>();
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private primera = true;

  constructor() {
    effect(() => {
      this.appPop(); // leerlo hace que el effect corra cada vez que cambia
      if (this.primera) {
        this.primera = false;
        return;
      }
      if (sinMovimiento() || typeof this.elemento.animate !== 'function') return;
      this.elemento.animate(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }],
        { duration: 240, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
      );
    });
  }
}

// true si la persona pidió menos movimiento en el sistema operativo.
export function sinMovimiento(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
