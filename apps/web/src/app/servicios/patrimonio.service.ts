import { httpResource } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RespuestaPatrimonio } from './modelos';

// httpResource hace la llamada HTTP y expone signals con su estado: cargando, error o valor.
// La URL pasa por el proxy de desarrollo (proxy.conf.json), que la manda a NestJS.
@Injectable({ providedIn: 'root' })
export class PatrimonioService {
  readonly resumen = httpResource<RespuestaPatrimonio>(() => '/api/patrimonio');
}
