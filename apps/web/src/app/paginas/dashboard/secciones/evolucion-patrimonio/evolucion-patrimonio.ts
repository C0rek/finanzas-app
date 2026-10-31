import { Component, computed, input } from '@angular/core';
import { LucideChevronDown } from '@lucide/angular';
import Decimal from 'decimal.js';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { EvolucionPatrimonio as DatosEvolucion } from '../../../../datos/modelos';

const CANTIDAD_MARCAS = 4; // divisiones del eje vertical (0, 5, 10, 15, 20)

// "Card Evolución": gráfico de barras del patrimonio al cierre de cada mes.
@Component({
  imports: [Card, DecimalPipe, LucideChevronDown],
  selector: 'app-evolucion-patrimonio',
  styleUrl: './evolucion-patrimonio.scss',
  templateUrl: './evolucion-patrimonio.html',
})
export class EvolucionPatrimonio {
  readonly evolucion = input.required<DatosEvolucion>();

  // computed() calcula un valor a partir de otros signals y se recalcula solo si cambian.
  // Marcas del eje en miles de US$, de arriba hacia abajo: 20, 15, 10, 5, 0.
  protected readonly marcas = computed(() => {
    const escalaMiles = new Decimal(this.evolucion().escalaMaximaUsd).div(1000);
    return Array.from({ length: CANTIDAD_MARCAS + 1 }, (_, i) =>
      escalaMiles.times(CANTIDAD_MARCAS - i).div(CANTIDAD_MARCAS).toString(),
    );
  });

  // Alto de cada barra como porcentaje de la escala.
  protected readonly barras = computed(() => {
    const { escalaMaximaUsd, meses } = this.evolucion();
    return meses.map((m) => ({
      ...m,
      altoPorcentaje: new Decimal(m.valorUsd).div(escalaMaximaUsd).times(100).toFixed(2),
    }));
  });
}
