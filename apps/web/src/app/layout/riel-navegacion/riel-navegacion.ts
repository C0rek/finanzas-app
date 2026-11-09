import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  protected readonly items: ItemRiel[] = [
    { etiqueta: 'Resumen', icono: LucideLayoutDashboard, ruta: '/dashboard' },
    { etiqueta: 'Movimientos', icono: LucideList, ruta: '/movimientos' },
    { etiqueta: 'Posiciones', icono: LucideWallet, ruta: '/posiciones' },
    { etiqueta: 'Trading', icono: LucideChartCandlestick, ruta: null },
    { etiqueta: 'Bienes físicos', icono: LucideBike, ruta: null },
    { etiqueta: 'Ajustes', icono: LucideSettings, ruta: null },
  ];
}
