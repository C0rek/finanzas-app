import { Component, input } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { DecimalTexto, ExposicionBtc as DatosExposicion } from '../../../../servicios/modelos';

// "Card Exposición BTC": porcentaje de la cartera en BTC y en qué está repartido.
@Component({
  imports: [Card, DecimalPipe, LucideChevronDown],
  selector: 'app-exposicion-btc',
  styleUrl: './exposicion-btc.scss',
  templateUrl: './exposicion-btc.html',
})
export class ExposicionBtc {
  readonly exposicion = input.required<DatosExposicion>();
  readonly carteraUsd = input.required<DecimalTexto>();
  readonly precioBtcUsd = input.required<DecimalTexto>();

  // Un color por parte, en el orden del boceto (de más a menos intenso).
  protected readonly colores = [
    'var(--color-chart)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
  ];
}
