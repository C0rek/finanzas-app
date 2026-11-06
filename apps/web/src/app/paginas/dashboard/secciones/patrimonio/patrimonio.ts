import { Component, computed, inject } from '@angular/core';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { formatearFecha } from '../../../../compartido/formato/formatear-fecha';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';

// "Card Patrimonio": total real calculado por el back. Si el back no responde
// muestra el error: nunca vuelve al dato de prueba.
@Component({
  imports: [Card, DecimalPipe],
  selector: 'app-patrimonio',
  styleUrl: './patrimonio.scss',
  templateUrl: './patrimonio.html',
})
export class Patrimonio {
  protected readonly recurso = inject(PatrimonioService).resumen;

  protected readonly avisos = computed(() => {
    if (this.recurso.error() || !this.recurso.hasValue()) return [];
    const { activos, avisos } = this.recurso.value();
    const conFecha = (simbolo: string, iso: string) => `${simbolo} (${formatearFecha(iso, 'corta')})`;
    const manuales = activos.filter((a) => a.origenPrecio === 'MANUAL');

    return [
      ...(manuales.length
        ? [`Valor manual: ${manuales.map((a) => conFecha(a.simbolo, a.precioDel)).join(', ')}`]
        : []),
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
