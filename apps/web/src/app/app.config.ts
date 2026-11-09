import { provideHttpClient } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { SincronizacionService } from './servicios/sincronizacion.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los parámetros de la URL (ej.: ?activo=BTC) llegan como input() de la página.
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(),
    // Al levantar la app se sincroniza sola: crear el servicio dispara la carga de todos los datos.
    provideAppInitializer(() => {
      inject(SincronizacionService);
    }),
  ],
};
