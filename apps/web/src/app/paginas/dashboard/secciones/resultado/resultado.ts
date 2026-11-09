import { Component, computed, inject } from '@angular/core';
import Decimal from 'decimal.js';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { SignoPipe } from '../../../../compartido/formato/signo.pipe';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';
import { sincronizable } from '../../../../servicios/sincronizacion.service';
import { Esqueleto } from '../../../../compartido/esqueleto/esqueleto';

// "Card Resultado": ganancia o pérdida no realizada de lo que tenés hoy, frente a lo que costó.
// Sale del total de la tabla de posiciones (mismo cálculo, misma fuente). Sin período: es a hoy.
@Component({
  imports: [Card, Esqueleto, DecimalPipe, SignoPipe],
  selector: 'app-resultado',
  styleUrl: './resultado.scss',
  templateUrl: './resultado.html',
})
export class Resultado {
  protected readonly recurso = sincronizable(inject(PatrimonioService).consultarPosiciones());

  private readonly total = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value().total : undefined,
  );

  // Resultado ÷ costo. Con decimal.js, nunca con number.
  protected readonly porcentaje = computed(() => {
    const t = this.total();
    if (!t || new Decimal(t.costoUsd).isZero()) return '0';
    return new Decimal(t.noRealizadaUsd).div(t.costoUsd).times(100).toFixed(2);
  });

  // Lo que hoy valen esas mismas posiciones: costo + resultado.
  protected readonly valorActual = computed(() => {
    const t = this.total();
    return t ? new Decimal(t.costoUsd).plus(t.noRealizadaUsd).toFixed(2) : '0';
  });
}
