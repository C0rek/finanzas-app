import { Component, computed, inject, linkedSignal } from '@angular/core';
import { LucideDownload, LucidePlus, LucideRefreshCw } from '@lucide/angular';
import { EncabezadoPagina } from '../../compartido/encabezado-pagina/encabezado-pagina';
import { claveMes, formatearFecha } from '../../compartido/formato/formatear-fecha';
import { MovimientosService } from '../../servicios/movimientos.service';
import { DetalleMovimiento } from './detalle-movimiento/detalle-movimiento';
import { TablaMovimientos } from './tabla-movimientos/tabla-movimientos';

// Página de Movimientos: la tabla avisa qué fila se eligió y el panel muestra ese movimiento.
@Component({
  imports: [
    EncabezadoPagina,
    TablaMovimientos,
    DetalleMovimiento,
    LucideDownload,
    LucideRefreshCw,
    LucidePlus,
  ],
  selector: 'app-movimientos',
  styleUrl: './movimientos.scss',
  templateUrl: './movimientos.html',
})
export class Movimientos {
  private readonly servicio = inject(MovimientosService);
  protected readonly movimientos = this.servicio.movimientos;

  // Arranca con el movimiento más reciente elegido, como en el boceto. null = panel cerrado.
  protected readonly seleccionadoId = linkedSignal<number | null>(
    () => this.movimientos()[0]?.id ?? null,
  );
  protected readonly seleccionado = computed(
    () => this.movimientos().find((m) => m.id === this.seleccionadoId()) ?? null,
  );

  // "9 movimientos en octubre · Bitunix sincronizado hace 12 min · datos de prueba"
  protected readonly descripcion = computed(() => {
    const ultimo = this.movimientos()[0];
    if (!ultimo) return this.servicio.estadoSincronizacion();
    const mes = claveMes(ultimo.fecha);
    const cantidad = this.movimientos().filter((m) => claveMes(m.fecha) === mes).length;
    const nombreMes = formatearFecha(ultimo.fecha, 'mes').split(' ')[0].toLowerCase();
    return `${cantidad} movimientos en ${nombreMes} · ${this.servicio.estadoSincronizacion()}`;
  });
}
