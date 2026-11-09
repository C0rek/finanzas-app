import { Component, input } from '@angular/core';

// Bloque gris con un brillo que lo recorre: ocupa el lugar de un dato mientras carga.
// Se arma la "forma" del contenido con varios esqueletos, así nada salta cuando llegan los datos.
//   <app-esqueleto ancho="60%" alto="30px" />
// Es decorativo (aria-hidden): quien lo usa pone al lado un texto para lectores de pantalla.
@Component({
  selector: 'app-esqueleto',
  template: '',
  styleUrl: './esqueleto.scss',
  host: {
    'aria-hidden': 'true',
    '[style.width]': 'ancho()',
    '[style.height]': 'alto()',
    '[style.border-radius]': 'radio()',
  },
})
export class Esqueleto {
  readonly ancho = input('100%');
  readonly alto = input('12px');
  readonly radio = input('6px');
}
