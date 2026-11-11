import { Component, computed, inject } from '@angular/core';
import { Card } from '../../../../compartido/card/card';
import { Avisos } from '../../../../compartido/avisos/avisos';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { formatearFecha } from '../../../../compartido/formato/formatear-fecha';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';
import { Esqueleto } from '../../../../compartido/esqueleto/esqueleto';
import { CifraAnimada } from '../../../../compartido/animacion/cifra-animada';

// "Card Patrimonio": total real calculado por el back. Si el back no responde
// muestra el error: nunca vuelve al dato de prueba.
@Component({
  imports: [Avisos, Card, Esqueleto, CifraAnimada, DecimalPipe],
  selector: 'app-patrimonio',
  styleUrl: './patrimonio.scss',
  templateUrl: './patrimonio.html',
})
export class Patrimonio {
  protected readonly recurso = inject(PatrimonioService).patrimonio();

  protected readonly horaCalculo = computed(() =>
    !this.recurso.error() && this.recurso.hasValue()
      ? formatearFecha(this.recurso.value().calculadoEn, 'hora')
      : '',
  );

  protected readonly avisos = computed(() => {
    if (this.recurso.error() || !this.recurso.hasValue()) return [];
    const { avisos } = this.recurso.value();
    const conFecha = (simbolo: string, iso: string) => `${simbolo} (${formatearFecha(iso, 'corta')})`;

    return [
      ...(avisos.desactualizados.length
        ? [`Precio desactualizado: ${avisos.desactualizados.map((a) => conFecha(a.simbolo, a.precioDel)).join(', ')}`]
        : []),
      ...(avisos.sinValorizar.length ? [`Sin valorizar, no suman: ${avisos.sinValorizar.join(', ')}`] : []),
      ...(avisos.saldosNegativos.length
        ? [`Saldo negativo, cuenta como 0: ${avisos.saldosNegativos.join(', ')}`]
        : []),
    ];
  });
}
