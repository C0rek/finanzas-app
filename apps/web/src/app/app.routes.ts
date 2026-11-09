import { Routes } from '@angular/router';
import { Dashboard } from './paginas/dashboard/dashboard';
import { Movimientos } from './paginas/movimientos/movimientos';
import { Posiciones } from './paginas/posiciones/posiciones';

// Cada ruta asocia una URL con el componente de página que se dibuja en el <router-outlet>.
export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: Dashboard, title: 'Dashboard · Nonio' },
  { path: 'movimientos', component: Movimientos, title: 'Movimientos · Nonio' },
  { path: 'posiciones', component: Posiciones, title: 'Posiciones · Nonio' },
  // Cualquier URL desconocida vuelve al dashboard.
  { path: '**', redirectTo: 'dashboard' },
];
