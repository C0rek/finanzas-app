import { Component, input } from '@angular/core';

// Card base de todas las secciones: fondo blanco, radio, padding y encabezado.
// input() declara una "propiedad" que completa quien usa el componente, como en Pencil:
//   <app-card titulo="Posiciones" subtitulo="Todos los exchanges">...contenido...</app-card>
@Component({
  selector: 'app-card',
  styleUrl: './card.scss',
  templateUrl: './card.html',
})
export class Card {
  // Opcional: una card sola en su página no repite el título de la página.
  readonly titulo = input<string>();
  readonly subtitulo = input<string>();
}
