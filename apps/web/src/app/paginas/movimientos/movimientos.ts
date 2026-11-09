import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { LucideDownload, LucidePlus } from '@lucide/angular';
import { BotonSincronizar } from '../../compartido/boton-sincronizar/boton-sincronizar';
import { Esqueleto } from '../../compartido/esqueleto/esqueleto';
import { EncabezadoPagina } from '../../compartido/encabezado-pagina/encabezado-pagina';
import { claveMes, formatearFecha } from '../../compartido/formato/formatear-fecha';
import { Movimiento } from '../../servicios/modelos';
import { MovimientosService } from '../../servicios/movimientos.service';
import { SincronizacionService } from '../../servicios/sincronizacion.service';
import { DetalleMovimiento } from './detalle-movimiento/detalle-movimiento';
import { activosDe } from './movimiento-vista';
import { TablaMovimientos } from './tabla-movimientos/tabla-movimientos';

// Página de Movimientos: la tabla avisa qué fila se eligió y el panel muestra ese movimiento.
@Component({
  imports: [
    EncabezadoPagina,
    TablaMovimientos,
    DetalleMovimiento,
    LucideDownload,
    BotonSincronizar,
    Esqueleto,
    LucidePlus,
  ],
  selector: 'app-movimientos',
  styleUrl: './movimientos.scss',
  templateUrl: './movimientos.html',
})
export class Movimientos {
  private readonly sincro = inject(SincronizacionService);
  protected readonly recurso = inject(MovimientosService).movimientos();
  protected readonly movimientos = computed(() =>
    !this.recurso.error() && this.recurso.hasValue() ? this.recurso.value() : [],
  );

  // ?activo=BTC en la URL (el link "Ver todos" del panel de Posiciones): arranca filtrado.
  readonly activo = input<string>();

  // Arranca con el movimiento más reciente elegido (del activo, si vino filtrado). null = panel cerrado.
  // Si los datos se recargan (Sincronizar) y el elegido sigue estando, se mantiene.
  protected readonly seleccionadoId = linkedSignal<{ lista: Movimiento[]; activo?: string }, number | null>({
    source: () => ({ lista: this.movimientos(), activo: this.activo() }),
    computation: ({ lista, activo }, anterior) => {
      const sigue = anterior?.value != null && lista.some((m) => m.id === anterior.value);
      if (sigue) return anterior!.value;
      const candidatos = activo ? lista.filter((m) => activosDe(m).includes(activo)) : lista;
      const masReciente = [...candidatos].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha))[0];
      return masReciente?.id ?? null;
    },
  });
  protected readonly seleccionado = computed(
    () => this.movimientos().find((m) => m.id === this.seleccionadoId()) ?? null,
  );

  // Forma del esqueleto mientras cargan: filas de la tabla y campos del panel de detalle.
  protected readonly filasEsqueleto = [1, 2, 3, 4, 5, 6, 7, 8];
  protected readonly camposEsqueleto = [1, 2, 3, 4];

  // "9 movimientos en octubre · spot importado de exports · historial parcial"
  protected readonly descripcion = computed(() => {
    const ultima = this.sincro.ultima();
    const origen =
      'spot importado de exports · historial parcial' +
      (ultima ? ` · actualizado a las ${formatearFecha(ultima.toISOString(), 'hora')}` : '');
    const ultimo = this.movimientos()[0];
    if (!ultimo) return origen;
    const mes = claveMes(ultimo.fecha);
    const cantidad = this.movimientos().filter((m) => claveMes(m.fecha) === mes).length;
    const nombreMes = formatearFecha(ultimo.fecha, 'mes').split(' ')[0].toLowerCase();
    return `${cantidad} movimientos en ${nombreMes} · ${origen}`;
  });
}
