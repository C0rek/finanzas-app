import { Component, computed, input, output } from '@angular/core';
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
import { decimalesDe, donde, etiquetas, etiquetaTipo, formatearCantidad } from '../movimiento-vista';

const ORIGENES: Record<OrigenMovimiento, string> = {
  API: 'Sincronizado por API',
  MANUAL: 'Cargado a mano',
  IMPORTADO: 'Importado de un export',
};

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

  // El detalle muestra la moneda real de la operación: si fue en pesos, en pesos.
  private readonly prefijo = computed(() => (this.movimiento().moneda === 'ARS' ? 'ARS ' : 'US$ '));

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

  // "US$ 837,60 pagados en USDT" en compras y ventas; el total solo en el resto.
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

  protected readonly decimalesActivo = computed(() => decimalesDe(this.movimiento().activo));
}
