import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import Decimal from 'decimal.js';
import { Card } from '../../../../compartido/card/card';
import { DecimalPipe } from '../../../../compartido/formato/decimal.pipe';
import { decimalesDePrecio } from '../../../../compartido/formato/formatear-decimal';
import { formatearFecha } from '../../../../compartido/formato/formatear-fecha';
import { SignoPipe } from '../../../../compartido/formato/signo.pipe';
import { PatrimonioService } from '../../../../servicios/patrimonio.service';
import { Esqueleto } from '../../../../compartido/esqueleto/esqueleto';

const UMBRAL_CHICO_USD = 1;
const CLAVE_OCULTAR_CHICOS = 'posiciones.ocultarChicos';

function leerPreferencia(): boolean {
  try {
    return localStorage.getItem(CLAVE_OCULTAR_CHICOS) === 'true';
  } catch {
    return false;
  }
}

// "Card Posiciones": tabla de posiciones con su total. Los datos salen del back.
// En el dashboard muestra solo las más grandes (limite); en la página de Posiciones, todas.
// Lo que no se conoce se muestra con una raya: nunca como un 0 ni como un dato de prueba.
@Component({
  imports: [Card, Esqueleto, DecimalPipe, SignoPipe, LucideArrowRight, RouterLink],
  selector: 'app-tabla-posiciones',
  styleUrl: './tabla-posiciones.scss',
  templateUrl: './tabla-posiciones.html',
})
export class TablaPosiciones {
  protected readonly recurso = inject(PatrimonioService).posiciones();
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

  // Forma del esqueleto: anchos del encabezado y tantas filas como se van a mostrar (máximo 10).
  protected readonly columnasEsqueleto = ['48px', '60px', '64px', '52px', '36px', '64px', '72px', '64px'];
  protected readonly columnasNumericasEsqueleto = [1, 2, 3, 4, 5, 6];
  protected readonly filasEsqueleto = computed(() =>
    Array.from({ length: Math.min(this.limite() ?? 10, 10) }, (_, i) => i),
  );

  // Switch "Ocultar saldos menores a US$ 1". Se recuerda en este navegador: es una preferencia
  // de vista, no un dato. localStorage puede fallar (modo privado), por eso el try.
  protected readonly ocultarChicos = signal(leerPreferencia());

  protected alternarChicos(): void {
    this.ocultarChicos.update((v) => !v);
    try {
      localStorage.setItem(CLAVE_OCULTAR_CHICOS, String(this.ocultarChicos()));
    } catch {
      // Sin almacenamiento la preferencia dura hasta recargar: no es grave.
    }
  }

  private readonly datos = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value() : undefined,
  );

  // Una posición sin valor conocido no se oculta: no sabemos si vale menos de US$ 1.
  protected readonly filtradas = computed(() => {
    const posiciones = this.datos()?.posiciones ?? [];
    if (!this.ocultarChicos()) return posiciones;
    return posiciones.filter((p) => p.valorUsd === null || new Decimal(p.valorUsd).gte(UMBRAL_CHICO_USD));
  });

  protected readonly ocultas = computed(
    () => (this.datos()?.posiciones.length ?? 0) - this.filtradas().length,
  );

  protected readonly visibles = computed(() => {
    const posiciones = this.filtradas();
    const limite = this.limite();
    return limite === null ? posiciones : posiciones.slice(0, limite);
  });

  // Hay más posiciones que las que se ven: el dashboard ofrece ir a la página completa.
  protected readonly recortada = computed(() => this.visibles().length < this.filtradas().length);

  // % no realizado de toda la cartera: sobre el costo de las posiciones con costo conocido.
  protected readonly pctTotal = computed(() => {
    const total = this.datos()?.total;
    if (!total || new Decimal(total.costoUsd).isZero()) return null;
    return new Decimal(total.noRealizadaUsd).dividedBy(total.costoUsd).times(100).toFixed(2);
  });

  // "Actualizado: precios de las 14:32 · último movimiento del 8 nov 2026".
  protected readonly actualizacion = computed(() => {
    const datos = this.datos();
    if (!datos) return '';
    const precios = `Actualizado: precios de las ${formatearFecha(datos.calculadoEn, 'hora')}`;
    if (!datos.movimientosHasta) return `${precios} · sin movimientos cargados`;
    return `${precios} · último movimiento del ${formatearFecha(datos.movimientosHasta, 'dia')}`;
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
