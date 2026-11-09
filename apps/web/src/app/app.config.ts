import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { SincronizacionService } from './servicios/sincronizacion.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    // Al levantar la app se sincroniza sola: crear el servicio dispara la carga de todos los datos.
    provideAppInitializer(() => {
      inject(SincronizacionService);
    }),
  ],
};
