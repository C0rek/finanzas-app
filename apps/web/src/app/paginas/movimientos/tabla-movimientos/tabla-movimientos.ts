import { Component, computed, input, linkedSignal, output, signal, WritableSignal } from '@angular/core';
import {
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucidePencil,
  LucideRefreshCw,
  LucideSearch,
} from '@lucide/angular';
import { DecimalPipe } from '../../../compartido/formato/decimal.pipe';
import { FechaPipe } from '../../../compartido/formato/fecha.pipe';
import { claveMes, formatearFecha } from '../../../compartido/formato/formatear-fecha';
import { Movimiento } from '../../../datos/modelos';
import {
  Categoria,
  CATEGORIAS,
  categoria,
  donde,
  etiquetas,
  etiquetaTipo,
  formatearCantidad,
} from '../movimiento-vista';

const TAMANO_PAGINA = 10;

// "Card Tabla": pestañas, filtros, la tabla y el paginador.
// Guarda su propio estado (qué filtros están elegidos) en signals,
// y la lista que se ve se calcula con computed() a partir de ese estado.
@Component({
  imports: [
    DecimalPipe,
    FechaPipe,
    LucideSearch,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideRefreshCw,
    LucidePencil,
  ],
  selector: 'app-tabla-movimientos',
  styleUrl: './tabla-movimientos.scss',
  templateUrl: './tabla-movimientos.html',
})
export class TablaMovimientos {
  readonly movimientos = input.required<Movimiento[]>();
  readonly seleccionadoId = input<number | null>(null);
  // output() es lo contrario de input(): el componente avisa algo hacia afuera.
  // La página escucha con (seleccionar)="..." y decide qué hacer.
  readonly seleccionar = output<number>();

  // Las funciones de movimiento-vista quedan disponibles en el HTML.
  protected readonly vista = { etiquetaTipo, formatearCantidad, donde, etiquetas };

  // --- Estado de los filtros ---
  protected readonly pestana = signal<Categoria | 'todos'>('todos');
  protected readonly busqueda = signal('');
  protected readonly filtroCuenta = signal('');
  protected readonly filtroActivo = signal('');
  protected readonly filtroEtiqueta = signal('');
  // linkedSignal: arranca con un valor calculado (el mes más reciente), pero se puede cambiar a mano.
  protected readonly filtroMes = linkedSignal(() => this.opcionesMes()[0]?.clave ?? '');
  protected readonly pagina = signal(0);

  // --- Opciones de los desplegables, sacadas de los datos ---
  protected readonly opcionesCuenta = computed(() =>
    unicos(this.movimientos().flatMap((m) => [m.cuenta, m.cuentaDestino ?? ''])),
  );
  protected readonly opcionesActivo = computed(() =>
    unicos(this.movimientos().map((m) => m.activo)),
  );
  protected readonly opcionesEtiqueta = computed(() =>
    unicos(this.movimientos().flatMap((m) => etiquetas(m).map((e) => e.texto))),
  );
  protected readonly opcionesMes = computed(() => {
    const meses = new Map<string, string>();
    for (const m of this.ordenados()) meses.set(claveMes(m.fecha), formatearFecha(m.fecha, 'mes'));
    return [...meses].map(([clave, etiqueta]) => ({ clave, etiqueta }));
  });

  // --- La lista que se ve ---
  private readonly ordenados = computed(() =>
    [...this.movimientos()].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha)),
  );

  // Todos los filtros menos la pestaña (así cada pestaña puede mostrar su cantidad).
  private readonly filtrados = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.ordenados().filter(
      (m) =>
        (!this.filtroMes() || claveMes(m.fecha) === this.filtroMes()) &&
        (!this.filtroCuenta() || [m.cuenta, m.cuentaDestino].includes(this.filtroCuenta())) &&
        (!this.filtroActivo() || m.activo === this.filtroActivo()) &&
        (!this.filtroEtiqueta() || etiquetas(m).some((e) => e.texto === this.filtroEtiqueta())) &&
        (!texto ||
          [m.activo, m.idExterno, m.nota].some((campo) => campo?.toLowerCase().includes(texto))),
    );
  });

  protected readonly pestanas = computed(() =>
    CATEGORIAS.map((c) => ({
      ...c,
      cantidad: this.filtrados().filter((m) => c.clave === 'todos' || categoria(m) === c.clave)
        .length,
    })),
  );

  private readonly visibles = computed(() =>
    this.filtrados().filter((m) => this.pestana() === 'todos' || categoria(m) === this.pestana()),
  );

  protected readonly paginaActual = computed(() => {
    const desde = this.pagina() * TAMANO_PAGINA;
    return this.visibles().slice(desde, desde + TAMANO_PAGINA);
  });

  protected readonly rango = computed(() => {
    const total = this.visibles().length;
    const desde = this.pagina() * TAMANO_PAGINA;
    return {
      texto: total === 0 ? '0 de 0' : `${desde + 1}–${desde + this.paginaActual().length} de ${total}`,
      hayAnterior: this.pagina() > 0,
      haySiguiente: desde + TAMANO_PAGINA < total,
    };
  });

  // Al cambiar cualquier filtro se vuelve a la primera página.
  protected cambiar<T>(filtro: WritableSignal<T>, valor: T): void {
    filtro.set(valor);
    this.pagina.set(0);
  }

  protected moverPagina(delta: number): void {
    this.pagina.update((p) => p + delta);
  }
}

function unicos(valores: string[]): string[] {
  return [...new Set(valores.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es'));
}
