import { Component, input } from '@angular/core';
import { Esqueleto } from '../esqueleto/esqueleto';

// "Title Row" del boceto, igual en todas las páginas: título, descripción y botones a la derecha.
//   <app-encabezado-pagina titulo="Movimientos" descripcion="..." [cargando]="!datos">
//     <button>...</button>
//   </app-encabezado-pagina>
@Component({
  imports: [Esqueleto],
  selector: 'app-encabezado-pagina',
  styleUrl: './encabezado-pagina.scss',
  templateUrl: './encabezado-pagina.html',
})
export class EncabezadoPagina {
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>();
  readonly cargando = input(false);
}
