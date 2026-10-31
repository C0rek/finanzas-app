import { Routes } from '@angular/router';
import { Dashboard } from './paginas/dashboard/dashboard';
import { Movimientos } from './paginas/movimientos/movimientos';

// Cada ruta asocia una URL con el componente de página que se dibuja en el <router-outlet>.
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard, title: 'Dashboard · Finanzas' },
  { path: 'movimientos', component: Movimientos, title: 'Movimientos · Finanzas' },
  // Cualquier URL desconocida vuelve al dashboard.
  { path: '**', redirectTo: 'dashboard' },
];
