import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import Decimal from 'decimal.js';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { decimalesDePrecio } from '../../../../compartido/formato/formatear-decimal';
import { formatearFecha } from '../../../../compartido/formato/formatear-fecha';
import { SignoPipe } from '../../../../compartido/formato/signo.pipe';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';

// "Card Posiciones": tabla de posiciones con su total. Los datos salen del back.
// En el dashboard muestra solo las más grandes (limite); en la página de Posiciones, todas.
// Lo que no se conoce se muestra con una raya: nunca como un 0 ni como un dato de prueba.
@Component({
  imports: [Card, DecimalPipe, SignoPipe, LucideArrowRight, RouterLink],
  selector: 'app-tabla-posiciones',
  styleUrl: './tabla-posiciones.scss',
  templateUrl: './tabla-posiciones.html',
})
export class TablaPosiciones {
  protected readonly recurso = inject(PatrimonioService).consultarPosiciones();
  protected readonly decimalesDePrecio = decimalesDePrecio;

  // "SPY-TOK" → "SPY": el chip de categoría ya dice que es tokenizada.
  protected nombreVisible(simbolo: string): string {
    return simbolo.replace(/-TOK$/, '');
  }

  // Unidades enteras (USDT, CEDEARs) con 2 decimales; fracciones chicas (BTC) con hasta 8.
  protected decimalesDeCantidad(cantidad: string): number {
    const n = new Decimal(cantidad).abs();
    if (n.gte(1)) return 2;
    if (n.gte(0.01)) return 4;
    return 8;
  }

  // Cuántas filas mostrar. null = todas. El back ya las manda ordenadas por valor US$, de mayor a menor.
  readonly limite = input<number | null>(null);

  private readonly datos = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value() : undefined,
  );

  protected readonly visibles = computed(() => {
    const posiciones = this.datos()?.posiciones ?? [];
    const limite = this.limite();
    return limite === null ? posiciones : posiciones.slice(0, limite);
  });

  // Hay más posiciones que las que se ven: el dashboard ofrece ir a la página completa.
  protected readonly recortada = computed(
    () => this.visibles().length < (this.datos()?.posiciones.length ?? 0),
  );

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
    const linea = (texto: string, valores: string[]) =>
      valores.length ? [`${texto}: ${valores.join(', ')}`] : [];
    return [
      ...linea('Precio desactualizado', desactualizados),
      ...linea('Sin valorizar, no suman', avisos.sinValorizar),
      ...linea('Sin costo en USD, resultado desconocido', avisos.sinPrecioPromedio),
      ...linea('Saldo negativo, cuenta como 0', avisos.saldosNegativos),
    ];
  });
}
