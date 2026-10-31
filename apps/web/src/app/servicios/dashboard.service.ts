import { Injectable, signal } from '@angular/core';
import { RESUMEN_DASHBOARD_PRUEBA } from './datos-prueba/resumen-dashboard';
import { ResumenDashboard } from './modelos';

// Un servicio es el único lugar que sabe de dónde salen los datos.
// providedIn: 'root' = Angular crea una sola instancia y se la da a quien la pida con inject().
// Hoy devuelve datos de prueba; cuando exista la API, solo cambia este archivo.
@Injectable({ providedIn: 'root' })
export class DashboardService {
  readonly resumen = signal<ResumenDashboard>(RESUMEN_DASHBOARD_PRUEBA).asReadonly();
}
