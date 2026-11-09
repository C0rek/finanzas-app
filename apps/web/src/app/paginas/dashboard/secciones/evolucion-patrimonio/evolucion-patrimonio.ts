import { Component, computed, inject } from '@angular/core';
import Decimal from 'decimal.js';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';

const CANTIDAD_MARCAS = 4; // divisiones del eje vertical
const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

/** Tope "redondo" del eje: el primer múltiplo de 1, 2, 2,5 o 5 (× 10^n) en el que entra el máximo. */
export function escalaRedonda(maximo: Decimal, divisiones = CANTIDAD_MARCAS): Decimal {
  if (maximo.lte(0)) return new Decimal(divisiones);
  const pasoMinimo = maximo.div(divisiones);
  const potencia = new Decimal(10).pow(pasoMinimo.log(10).floor());
  const paso = [1, 2, 2.5, 5, 10].map((f) => potencia.times(f)).find((p) => p.gte(pasoMinimo))!;
  return paso.times(divisiones);
}

// "Card Evolución": patrimonio al cierre de cada mes, con datos de la base.
@Component({
  imports: [Card, DecimalPipe],
  selector: 'app-evolucion-patrimonio',
  styleUrl: './evolucion-patrimonio.scss',
  templateUrl: './evolucion-patrimonio.html',
})
export class EvolucionPatrimonio {
  protected readonly recurso = inject(PatrimonioService).consultarEvolucion();

  private readonly meses = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value().meses : [],
  );

  private readonly escala = computed(() =>
    escalaRedonda(Decimal.max(0, ...this.meses().map((m) => m.valorUsd))),
  );

  // Marcas del eje en miles de US$, de arriba hacia abajo (con coma decimal: "1,5").
  protected readonly marcas = computed(() => {
    const escalaMiles = this.escala().div(1000);
    return Array.from({ length: CANTIDAD_MARCAS + 1 }, (_, i) =>
      escalaMiles.times(CANTIDAD_MARCAS - i).div(CANTIDAD_MARCAS).toString().replace('.', ','),
    );
  });

  // Alto de cada barra como porcentaje de la escala. "2026-10" → "Oct".
  protected readonly barras = computed(() =>
    this.meses().map((m) => ({
      ...m,
      etiqueta: MESES[Number(m.mes.slice(5, 7)) - 1],
      altoPorcentaje: new Decimal(m.valorUsd).div(this.escala()).times(100).toFixed(2),
    })),
  );
}
