import { Component, computed, input } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';

// Avisos de una card ("Precio desactualizado: …", "Sin valorizar: …") plegados detrás de una
// sola línea con ícono. <details>/<summary> es nativo del navegador: se abre con clic, Enter o
// Espacio y los lectores de pantalla lo anuncian como "expandido/contraído" sin código extra.
//   <app-avisos [avisos]="avisos()" />
@Component({
  imports: [LucideTriangleAlert],
  selector: 'app-avisos',
  styleUrl: './avisos.scss',
  template: `
    @if (avisos().length > 0) {
      <details>
        <summary>
          <svg lucideTriangleAlert [size]="14" aria-hidden="true"></svg>
          {{ resumen() }}
        </summary>
        <ul>
          @for (aviso of avisos(); track aviso) {
            <li>{{ aviso }}</li>
          }
        </ul>
      </details>
    }
  `,
})
export class Avisos {
  readonly avisos = input.required<string[]>();

  protected readonly resumen = computed(() => {
    const n = this.avisos().length;
    return n === 1 ? '1 aviso sobre estos datos' : `${n} avisos sobre estos datos`;
  });
}
