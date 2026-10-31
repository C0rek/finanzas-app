import { Injectable, signal } from '@angular/core';
import { ESTADO_SINCRONIZACION_PRUEBA, MOVIMIENTOS_PRUEBA } from './datos-prueba/movimientos';
import { Movimiento } from './modelos';

// Igual que DashboardService: hoy datos de prueba, mañana la API.
@Injectable({ providedIn: 'root' })
export class MovimientosService {
  readonly movimientos = signal<Movimiento[]>(MOVIMIENTOS_PRUEBA).asReadonly();
  readonly estadoSincronizacion = signal(ESTADO_SINCRONIZACION_PRUEBA).asReadonly();
}
