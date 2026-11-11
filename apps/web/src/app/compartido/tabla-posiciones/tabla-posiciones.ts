import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { LucideArrowRight } from '@lucide/angular';
import Decimal from 'decimal.js';
import { Card } from '../card/card';
import { Avisos } from '../avisos/avisos';
import { DecimalPipe } from '../formato/decimal.pipe';
import { decimalesDeCantidad, decimalesDePrecio } from '../formato/formatear-decimal';
import { DetallePosicion } from './detalle-posicion/detalle-posicion';
import { formatearFecha } from '../formato/formatear-fecha';
import { SignoPipe } from '../formato/signo.pipe';
import { PatrimonioService } from '../../servicios/patrimonio.service';
import { Esqueleto } from '../esqueleto/esqueleto';

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
  imports: [Avisos, Card, Esqueleto, DecimalPipe, SignoPipe, LucideArrowRight, RouterLink, DetallePosicion],
  selector: 'app-tabla-posiciones',
  styleUrl: './tabla-posiciones.scss',
  templateUrl: './tabla-posiciones.html',
})
export class TablaPosiciones {
  protected readonly recurso = inject(PatrimonioService).posiciones();
  protected readonly decimalesDePrecio = decimalesDePrecio;
  protected readonly decimalesDeCantidad = decimalesDeCantidad;

  // "SPY-TOK" → "SPY": el chip de categoría ya dice que es tokenizada.
  protected nombreVisible(simbolo: string): string {
    return simbolo.replace(/-TOK$/, '');
  }

  // Cuántas filas mostrar. null = todas. El back ya las manda ordenadas por valor en dólares, de mayor a menor.
  readonly limite = input<number | null>(null);

  // Forma del esqueleto: anchos del encabezado y tantas filas como se van a mostrar (máximo 10).
  protected readonly columnasEsqueleto = ['48px', '60px', '64px', '52px', '36px', '64px', '72px', '64px'];
  protected readonly columnasNumericasEsqueleto = [1, 2, 3, 4, 5, 6];
  protected readonly filasEsqueleto = computed(() =>
    Array.from({ length: Math.min(this.limite() ?? 10, 10) }, (_, i) => i),
  );

  // Switch "Ocultar saldos menores a $ 1". Se recuerda en este navegador: es una preferencia
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

  // Una posición sin valor conocido no se oculta: no sabemos si vale menos de $ 1.
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

  // --- Panel lateral ---
  // Se guarda el símbolo y no la fila: si "Sincronizar" recarga los datos, el panel
  // muestra los nuevos. Si el activo ya no está, se cierra solo.
  // ?activo=BTC en la URL de Posiciones (viene de una fila del dashboard): arranca con ese panel abierto.
  readonly activoInicial = input<string | null>(null);
  protected readonly seleccionado = linkedSignal<string | null>(() => this.activoInicial() ?? null);
  protected readonly posicionSeleccionada = computed(
    () => this.datos()?.posiciones.find((p) => p.activo === this.seleccionado()) ?? null,
  );
  protected readonly totalCarteraUsd = computed(() => this.datos()?.total.valorUsd ?? '0');

  private readonly router = inject(Router);

  // En el dashboard la card es angosta para el panel: la fila lleva a Posiciones con ese activo abierto.
  // En Posiciones, click en la fila abierta la cierra; en otra, cambia el panel a esa.
  protected elegir(activo: string): void {
    if (this.limite() !== null) {
      void this.router.navigate(['/posiciones'], { queryParams: { activo } });
      return;
    }
    this.seleccionado.update((actual) => (actual === activo ? null : activo));
  }

  // Hay más posiciones que las que se ven: el dashboard ofrece ir a la página completa.
  protected readonly recortada = computed(() => this.visibles().length < this.filtradas().length);

  // % no realizado de toda la cartera: sobre el costo de las posiciones con costo conocido.
  protected readonly pctTotal = computed(() => {
    const total = this.datos()?.total;
    // El % lo calcula la API; sin costo conocido no hay porcentaje que mostrar.
    if (!total || new Decimal(total.costoUsd).isZero()) return null;
    return total.noRealizadaPct;
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
