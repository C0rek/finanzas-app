import { Component, computed, inject } from '@angular/core';
import { LucideRefreshCw } from '@lucide/angular';
import { SincronizacionService } from '../../servicios/sincronizacion.service';

// Botón "Sincronizar" del encabezado: vuelve a pedir los datos de la pantalla.
// Mientras trabaja, el ícono gira y el texto cambia; al terminar se anuncia a los lectores de pantalla.
@Component({
  imports: [LucideRefreshCw],
  selector: 'app-boton-sincronizar',
  template: `
    <button
      class="boton boton--primario"
      type="button"
      [class.girando]="sincro.sincronizando()"
      [attr.aria-busy]="sincro.sincronizando()"
      (click)="sincro.sincronizar()"
    >
      <!-- El texto no cambia (así el botón no cambia de ancho): la señal es el ícono girando. -->
      <svg lucideRefreshCw [size]="16"></svg> Sincronizar
    </button>
    <span class="solo-lectores" aria-live="polite">{{ aviso() }}</span>
  `,
  styles: `
    :host {
      display: contents;
    }

    .girando {
      cursor: progress;

      svg {
        animation: girar 0.8s linear infinite;
      }
    }

    @keyframes girar {
      to {
        transform: rotate(360deg);
      }
    }
  `,
})
export class BotonSincronizar {
  protected readonly sincro = inject(SincronizacionService);
  protected readonly aviso = computed(() =>
    this.sincro.sincronizando() ? 'Sincronizando…' : this.sincro.ultima() ? 'Datos actualizados' : '',
  );
}
