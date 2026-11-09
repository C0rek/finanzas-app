import { Component, computed, inject } from '@angular/core';
import { LucideDownload, LucidePlus } from '@lucide/angular';
import { BotonSincronizar } from '../../compartido/boton-sincronizar/boton-sincronizar';
import { EncabezadoPagina } from '../../compartido/encabezado-pagina/encabezado-pagina';
import { formatearFecha } from '../../compartido/formato/formatear-fecha';
import { DashboardService } from '../../servicios/dashboard.service';
import { SincronizacionService } from '../../servicios/sincronizacion.service';
import { EvolucionPatrimonio } from './secciones/evolucion-patrimonio/evolucion-patrimonio';
import { ExposicionBtc } from './secciones/exposicion-btc/exposicion-btc';
import { Patrimonio } from './secciones/patrimonio/patrimonio';
import { Resultado } from './secciones/resultado/resultado';
import { TablaPosiciones } from './secciones/tabla-posiciones/tabla-posiciones';

// Página del Dashboard: pide los datos al servicio y se los reparte a cada sección.
@Component({
  imports: [
    EncabezadoPagina,
    BotonSincronizar,
    ExposicionBtc,
    Patrimonio,
    Resultado,
    EvolucionPatrimonio,
    TablaPosiciones,
    LucideDownload,
    LucidePlus,
  ],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  // inject() le pide a Angular la instancia del servicio.
  protected readonly resumen = inject(DashboardService).resumen;
  private readonly sincro = inject(SincronizacionService);

  // Debajo del título: que los totales son parciales (se dice una sola vez, acá y no en cada
  // card) y cuándo fue la última sincronización con la base.
  protected readonly descripcion = computed(() => {
    const parcial = 'Solo activos spot: los totales son parciales';
    const ultima = this.sincro.ultima();
    if (!ultima) return `${parcial} · Sincronizando…`;
    const iso = ultima.toISOString();
    return `${parcial} · Última sincronización: ${formatearFecha(iso, 'dia')}, ${formatearFecha(iso, 'hora')}`;
  });
}
