import { Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowRight, LucidePlus, LucideX } from '@lucide/angular';
import Decimal from 'decimal.js';
import { DecimalPipe } from '../../../compartido/formato/decimal.pipe';
import { FechaPipe } from '../../../compartido/formato/fecha.pipe';
import {
  decimalesDePrecio,
  decimalesVisibles,
  formatearDecimal,
} from '../../../compartido/formato/formatear-decimal';
import { Movimiento, OrigenMovimiento } from '../../../servicios/modelos';
import { donde, etiquetas, etiquetaTipo, formatearCantidad } from '../movimiento-vista';

const ORIGENES: Record<OrigenMovimiento, string> = {
  API: 'Sincronizado por API',
  MANUAL: 'Cargado a mano',
  IMPORTADO: 'Importado de un export',
};

// "Panel Detalle": todo sobre el movimiento elegido en la tabla.
@Component({
  imports: [DecimalPipe, FechaPipe, RouterLink, LucideX, LucideArrowRight, LucidePlus],
  selector: 'app-detalle-movimiento',
  styleUrl: './detalle-movimiento.scss',
  templateUrl: './detalle-movimiento.html',
  // host: atributos y eventos del propio <app-detalle-movimiento>.
  host: {
    '[class.saliendo]': 'saliendo()',
    '(animationend)': 'alTerminarAnimacion($event)',
    '(document:keydown.escape)': 'pedirCierre()',
  },
})
export class DetalleMovimiento {
  readonly movimiento = input.required<Movimiento>();
  readonly cerrar = output<void>();

  // Al cerrar, primero corre la animación de salida y recién al terminar se avisa a la página
  // (que es la que saca el panel). Así se ve hacia dónde se fue en vez de desaparecer de golpe.
  protected readonly saliendo = signal(false);

  private cerrado = false;

  protected pedirCierre(): void {
    if (this.saliendo()) return;
    this.saliendo.set(true);
    // Respaldo: si el navegador no dispara el fin de la animación, igual se cierra.
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

  protected readonly titulo = computed(
    () => `${etiquetaTipo(this.movimiento())} de ${this.movimiento().activo}`,
  );
  protected readonly cantidad = computed(() => formatearCantidad(this.movimiento(), true));
  protected readonly donde = computed(() => donde(this.movimiento()));
  protected readonly etiquetas = computed(() => etiquetas(this.movimiento()));

  // El detalle muestra la moneda real de la operación: si fue en pesos, en pesos.
  private readonly prefijo = computed(() => (this.movimiento().moneda === 'ARS' ? 'ARS ' : '$ '));

  protected readonly precio = computed(() => {
    const { precio } = this.movimiento();
    if (!precio) return null;
    return formatearDecimal(precio, { decimales: decimalesDePrecio(precio), prefijo: this.prefijo() });
  });

  // "0,50 USDT": la comisión se muestra en el activo en que se cobró.
  protected readonly comision = computed(() => {
    const { comision } = this.movimiento();
    if (!comision) return null;
    return formatearDecimal(comision.monto, {
      decimales: decimalesVisibles(comision.monto, 2),
      sufijo: ` ${comision.activo}`,
    });
  });

  protected readonly origen = computed(() => ORIGENES[this.movimiento().origen]);

  // "$ 837,60 pagados en USDT" en compras y ventas; el total solo en el resto.
  protected readonly resumenTotal = computed(() => {
    const { total, pagadoCon, tipo } = this.movimiento();
    if (!total) return null;
    const monto = formatearDecimal(new Decimal(total).abs().toString(), {
      decimales: 2,
      prefijo: this.prefijo(),
    });
    if (!pagadoCon) return monto;
    return `${monto} ${tipo === 'VENTA' ? 'cobrados' : 'pagados'} en ${pagadoCon}`;
  });

  protected readonly decimalesActivo = computed(() => this.movimiento().decimales);
}
