import { Component, computed, input, output } from '@angular/core';
import { LucideArrowRight, LucidePlus, LucideX } from '@lucide/angular';
import Decimal from 'decimal.js';
import { DecimalPipe } from '../../../compartido/formato/decimal.pipe';
import { FechaPipe } from '../../../compartido/formato/fecha.pipe';
import { formatearDecimal } from '../../../compartido/formato/formatear-decimal';
import { Movimiento } from '../../../datos/modelos';
import { decimalesDe, donde, etiquetas, etiquetaTipo, formatearCantidad } from '../movimiento-vista';

// "Panel Detalle": todo sobre el movimiento elegido en la tabla.
@Component({
  imports: [DecimalPipe, FechaPipe, LucideX, LucideArrowRight, LucidePlus],
  selector: 'app-detalle-movimiento',
  styleUrl: './detalle-movimiento.scss',
  templateUrl: './detalle-movimiento.html',
})
export class DetalleMovimiento {
  readonly movimiento = input.required<Movimiento>();
  readonly cerrar = output<void>();

  protected readonly titulo = computed(
    () => `${etiquetaTipo(this.movimiento())} de ${this.movimiento().activo}`,
  );
  protected readonly cantidad = computed(() => formatearCantidad(this.movimiento(), true));
  protected readonly donde = computed(() => donde(this.movimiento()));
  protected readonly etiquetas = computed(() => etiquetas(this.movimiento()));

  // "US$ 837,60 pagados en USDT" en compras y ventas; el total solo en el resto.
  protected readonly resumenTotal = computed(() => {
    const { totalUsd, pagadoCon, tipo } = this.movimiento();
    if (!totalUsd) return null;
    const monto = formatearDecimal(new Decimal(totalUsd).abs().toString(), {
      decimales: 2,
      prefijo: 'US$ ',
    });
    if (!pagadoCon) return monto;
    return `${monto} ${tipo === 'VENTA' ? 'cobrados' : 'pagados'} en ${pagadoCon}`;
  });

  protected readonly decimalesActivo = computed(() => decimalesDe(this.movimiento().activo));
}
