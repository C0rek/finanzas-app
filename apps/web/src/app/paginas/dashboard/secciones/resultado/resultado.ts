import { Component, computed, inject } from '@angular/core';
import Decimal from 'decimal.js';
import { LucideChevronDown, LucideChevronUp } from '@lucide/angular';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { SignoPipe } from '../../../../compartido/formato/signo.pipe';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';
import { Esqueleto } from '../../../../compartido/esqueleto/esqueleto';

// "Card Resultado": ganancia o pérdida no realizada de lo que tenés hoy, frente a lo que costó.
// Sale del total de la tabla de posiciones (mismo cálculo, misma fuente). Sin período: es a hoy.
@Component({
  imports: [Card, Esqueleto, DecimalPipe, SignoPipe, LucideChevronUp, LucideChevronDown],
  selector: 'app-resultado',
  styleUrl: './resultado.scss',
  templateUrl: './resultado.html',
})
export class Resultado {
  protected readonly recurso = inject(PatrimonioService).posiciones();

  private readonly total = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value().total : undefined,
  );

  // Resultado ÷ costo: lo calcula la API, acá solo se muestra.
  protected readonly porcentaje = computed(() => this.total()?.noRealizadaPct ?? '0');

  // Lo que hoy valen esas mismas posiciones: costo + resultado.
  protected readonly valorActual = computed(() => {
    const t = this.total();
    return t ? new Decimal(t.costoUsd).plus(t.noRealizadaUsd).toFixed(2) : '0';
  });
}
