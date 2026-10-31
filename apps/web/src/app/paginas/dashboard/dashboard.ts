import { Component, inject } from '@angular/core';
import { LucideDownload, LucidePlus, LucideRefreshCw } from '@lucide/angular';
import { EncabezadoPagina } from '../../compartido/encabezado-pagina/encabezado-pagina';
import { DashboardService } from '../../servicios/dashboard.service';
import { EvolucionPatrimonio } from './secciones/evolucion-patrimonio/evolucion-patrimonio';
import { ExposicionBtc } from './secciones/exposicion-btc/exposicion-btc';
import { Patrimonio } from './secciones/patrimonio/patrimonio';
import { Resultado } from './secciones/resultado/resultado';
import { TablaPosiciones } from './secciones/tabla-posiciones/tabla-posiciones';

// Página del Dashboard: pide los datos al servicio y se los reparte a cada sección.
@Component({
  imports: [
    EncabezadoPagina,
    ExposicionBtc,
    Patrimonio,
    Resultado,
    EvolucionPatrimonio,
    TablaPosiciones,
    LucideDownload,
    LucideRefreshCw,
    LucidePlus,
  ],
  selector: 'app-dashboard',
  styleUrl: './dashboard.scss',
  templateUrl: './dashboard.html',
})
export class Dashboard {
  // inject() le pide a Angular la instancia del servicio.
  protected readonly resumen = inject(DashboardService).resumen;
}
