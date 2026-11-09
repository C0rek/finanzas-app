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

  // Después de sincronizar, el encabezado dice a qué hora quedaron actualizados los datos.
  protected readonly descripcion = computed(() => {
    const ultima = this.sincro.ultima();
    return ultima
      ? `Actualizado a las ${formatearFecha(ultima.toISOString(), 'hora')}`
      : this.resumen().estadoSincronizacion;
  });
}
