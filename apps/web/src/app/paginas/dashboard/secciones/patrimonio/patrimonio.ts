import { Component, input } from '@angular/core';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { Patrimonio as DatosPatrimonio } from '../../../../servicios/modelos';

// "Card Patrimonio": total y su división entre cartera de inversión y el resto.
@Component({
  imports: [Card, DecimalPipe],
  selector: 'app-patrimonio',
  styleUrl: './patrimonio.scss',
  templateUrl: './patrimonio.html',
})
export class Patrimonio {
  readonly patrimonio = input.required<DatosPatrimonio>();
}
