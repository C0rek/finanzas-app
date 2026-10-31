import { Component, input } from '@angular/core';

// "Title Row" del boceto, igual en todas las páginas: título, descripción y botones a la derecha.
//   <app-encabezado-pagina titulo="Movimientos" descripcion="...">
//     <button>...</button>
//   </app-encabezado-pagina>
@Component({
  selector: 'app-encabezado-pagina',
  styleUrl: './encabezado-pagina.scss',
  templateUrl: './encabezado-pagina.html',
})
export class EncabezadoPagina {
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>();
}
