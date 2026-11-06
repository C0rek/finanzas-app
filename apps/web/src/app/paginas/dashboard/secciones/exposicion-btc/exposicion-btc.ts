import { Component, computed, inject } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { formatearDecimal } from '../../../../compartido/formato/formatear-decimal';
import { formatearFecha } from '../../../../compartido/formato/formatear-fecha';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';

// "Card Exposición BTC": porcentaje de la cartera en BTC y en qué está repartido.
// Los datos salen del back. Si no responde, muestra el error: nunca vuelve al dato de prueba.
@Component({
  imports: [Card, DecimalPipe, LucideChevronDown],
  selector: 'app-exposicion-btc',
  styleUrl: './exposicion-btc.scss',
  templateUrl: './exposicion-btc.html',
})
export class ExposicionBtc {
  protected readonly recurso = inject(PatrimonioService).consultarExposicionBtc();

  // Un color por parte, en el orden del boceto (de más a menos intenso).
  protected readonly colores = [
    'var(--color-chart)',
    'var(--color-chart-2)',
    'var(--color-chart-3)',
    'var(--color-chart-4)',
  ];

  private readonly datos = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value() : undefined,
  );

  protected readonly subtitulo = computed(() => {
    const datos = this.datos();
    if (!datos || datos.carteraUsd === '0.00' || !datos.precioBtcUsd) return undefined;
    return `Sobre tu cartera de inversión de ${formatearDecimal(datos.carteraUsd, { prefijo: 'US$ ' })}`;
  });

  protected readonly horaCalculo = computed(() => {
    const datos = this.datos();
    return datos ? formatearFecha(datos.calculadoEn, 'hora') : '';
  });

  protected readonly avisos = computed(() => {
    const avisos = this.datos()?.avisos;
    if (!avisos) return [];
    const desactualizados = avisos.desactualizados.map(
      (a) => `${a.simbolo} (${formatearFecha(a.precioDel, 'corta')})`,
    );
    return [
      ...(desactualizados.length ? [`Precio desactualizado: ${desactualizados.join(', ')}`] : []),
      ...(avisos.sinValorizar.length ? [`Sin valorizar, no suman: ${avisos.sinValorizar.join(', ')}`] : []),
    ];
  });
}
