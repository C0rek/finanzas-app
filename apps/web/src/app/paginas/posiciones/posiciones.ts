import { Component } from '@angular/core';
import { EncabezadoPagina } from '../../compartido/encabezado-pagina/encabezado-pagina';
import { TablaPosiciones } from '../dashboard/secciones/tabla-posiciones/tabla-posiciones';

// Página de Posiciones: la misma tabla del dashboard, pero con todas las filas (sin límite).
@Component({
  imports: [EncabezadoPagina, TablaPosiciones],
  selector: 'app-posiciones',
  styleUrl: './posiciones.scss',
  templateUrl: './posiciones.html',
})
export class Posiciones {}
