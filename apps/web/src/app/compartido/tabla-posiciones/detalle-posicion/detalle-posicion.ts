import { afterNextRender, Component, computed, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucideX } from '@lucide/angular';
import Decimal from 'decimal.js';
import { DecimalPipe } from '../../formato/decimal.pipe';
import { FechaPipe } from '../../formato/fecha.pipe';
import { decimalesDeCantidad, decimalesDePrecio } from '../../formato/formatear-decimal';
import { SignoPipe } from '../../formato/signo.pipe';
import { Posicion } from '../../../servicios/modelos';
import { MovimientosService } from '../../../servicios/movimientos.service';
import { activosDe, etiquetaTipo, formatearCantidad } from '../../../paginas/movimientos/movimiento-vista';

const ULTIMOS = 5;

// Panel lateral con todo sobre la posición elegida: dónde está, spot y futuros,
// resultados y sus últimos movimientos. Mismo estilo que el detalle de Movimientos.
@Component({
  imports: [DecimalPipe, FechaPipe, SignoPipe, RouterLink, LucideX, LucideArrowRight],
  selector: 'app-detalle-posicion',
  styleUrl: './detalle-posicion.scss',
  templateUrl: './detalle-posicion.html',
  host: {
    role: 'complementary',
    '[attr.aria-label]': '"Detalle de " + nombre()',
    '[class.saliendo]': 'saliendo()',
    '(animationend)': 'alTerminarAnimacion($event)',
    '(document:keydown.escape)': 'pedirCierre()',
  },
})
export class DetallePosicion {
  readonly posicion = input.required<Posicion>();
  // Valor de toda la tabla (inversión + liquidez), para el % de la cartera.
  readonly totalCarteraUsd = input.required<string>();
  readonly cerrar = output<void>();

  protected readonly decimalesDeCantidad = decimalesDeCantidad;
  protected readonly decimalesDePrecio = decimalesDePrecio;
  protected readonly vista = { etiquetaTipo, formatearCantidad };

  // Al abrir, el foco va a la X: con teclado se puede cerrar enseguida (o con Esc).
  private readonly botonCerrar = viewChild.required<ElementRef<HTMLButtonElement>>('botonCerrar');
  constructor() {
    afterNextRender(() => this.botonCerrar().nativeElement.focus({ preventScroll: true }));
  }

  // "SPY-TOK" → "SPY", igual que en la tabla.
  protected readonly nombre = computed(() => this.posicion().activo.replace(/-TOK$/, ''));

  protected readonly pctCartera = computed(() => {
    const { valorUsd } = this.posicion();
    const total = new Decimal(this.totalCarteraUsd());
    if (!valorUsd || total.isZero()) return null;
    return new Decimal(valorUsd).dividedBy(total).times(100).toFixed(2);
  });

  // Los movimientos ya están cargados en la app (los comparte la página de Movimientos).
  // Se cuentan los del activo y aquellos en que se usó para pagar, igual que el filtro de Movimientos.
  // Solo compras y ventas: los SALDO son ajustes de carga, no operaciones.
  private readonly movimientos = inject(MovimientosService).movimientos();
  protected readonly cargandoMovimientos = computed(
    () => !this.movimientos.hasValue() && !this.movimientos.error(),
  );
  protected readonly errorMovimientos = computed(() => !!this.movimientos.error());
  protected readonly ultimos = computed(() => {
    if (!this.movimientos.hasValue() || this.movimientos.error()) return [];
    const simbolo = this.posicion().activo;
    return this.movimientos
      .value()
      .filter((m) => (m.tipo === 'COMPRA' || m.tipo === 'VENTA') && activosDe(m).includes(simbolo))
      .sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))
      .slice(0, ULTIMOS);
  });

  // Mismo cierre animado que el detalle de Movimientos.
  protected readonly saliendo = signal(false);
  private cerrado = false;

  protected pedirCierre(): void {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    setTimeout(() => this.terminarCierre(), 400);
  }

  protected alTerminarAnimacion(evento: AnimationEvent): void {
    if (this.saliendo() && evento.target === evento.currentTarget) this.terminarCierre();
  }

  private terminarCierre(): void {
    if (this.cerrado) return;
    this.cerrado = true;
    this.cerrar.emit();
  }
}
