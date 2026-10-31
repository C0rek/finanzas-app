import { Component, input } from '@angular/core';
import { LucideArrowRight } from '@lucide/angular';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { SignoPipe } from '../../../../compartido/formato/signo.pipe';
import { DecimalTexto, Posicion } from '../../../../datos/modelos';

// "Card Posiciones": tabla resumida de posiciones con su total.
@Component({
  imports: [Card, DecimalPipe, SignoPipe, LucideArrowRight],
  selector: 'app-tabla-posiciones',
  styleUrl: './tabla-posiciones.scss',
  templateUrl: './tabla-posiciones.html',
})
export class TablaPosiciones {
  readonly posiciones = input.required<Posicion[]>();
  readonly total = input.required<{ valorUsd: DecimalTexto; noRealizadaUsd: DecimalTexto }>();
}
