import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, map } from 'rxjs';
import {
  LucideBike,
  LucideChartCandlestick,
  LucideDynamicIcon,
  LucideIcon,
  LucideLayoutDashboard,
  LucideList,
  LucideSettings,
  LucideWallet,
} from '@lucide/angular';

interface ItemRiel {
  etiqueta: string;
  icono: LucideIcon;
  // null = la pantalla todavía no existe: se muestra el ícono deshabilitado.
  ruta: string | null;
}

// "Icon Rail" del boceto: navegación principal con un ícono por sección.
@Component({
  imports: [RouterLink, RouterLinkActive, LucideDynamicIcon],
  selector: 'app-riel-navegacion',
  styleUrl: './riel-navegacion.scss',
  templateUrl: './riel-navegacion.html',
})
export class RielNavegacion {
  private readonly router = inject(Router);

  // URL actual como signal: se actualiza cada vez que termina una navegación.
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  // Posición del ítem de la página actual (-1 si ninguno coincide: no se dibuja el indicador).
  protected readonly indiceActivo = computed(() =>
    this.items.findIndex((i) => i.ruta && this.url().startsWith(i.ruta)),
  );

  protected readonly items: ItemRiel[] = [
    { etiqueta: 'Resumen', icono: LucideLayoutDashboard, ruta: '/dashboard' },
    { etiqueta: 'Movimientos', icono: LucideList, ruta: '/movimientos' },
    { etiqueta: 'Posiciones', icono: LucideWallet, ruta: '/posiciones' },
    { etiqueta: 'Trading', icono: LucideChartCandlestick, ruta: null },
    { etiqueta: 'Bienes físicos', icono: LucideBike, ruta: null },
    { etiqueta: 'Ajustes', icono: LucideSettings, ruta: null },
  ];
}
