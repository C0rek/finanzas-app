import { Component, input } from '@angular/core';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { SignoPipe } from '../../../../compartido/formato/signo.pipe';
import { Resultado as DatosResultado } from '../../../../datos/modelos';

// "Card Resultado": ganancia no realizada y realizada del período.
@Component({
  imports: [Card, DecimalPipe, SignoPipe],
  selector: 'app-resultado',
  styleUrl: './resultado.scss',
  templateUrl: './resultado.html',
})
export class Resultado {
  readonly resultado = input.required<DatosResultado>();
}
