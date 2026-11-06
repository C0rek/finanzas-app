import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { RespuestaExposicionBtc, RespuestaPatrimonio } from './modelos';

// httpResource hace la llamada HTTP y expone signals con su estado: cargando, error o valor.
// La URL pasa por el proxy de desarrollo (proxy.conf.json), que la manda a NestJS.
@Injectable({ providedIn: 'root' })
export class PatrimonioService {
  // Se llama desde un componente y el recurso vive lo que vive ese componente:
  // así, cada vez que se entra a la pantalla se consulta el precio del momento.
  consultar(): HttpResourceRef<RespuestaPatrimonio | undefined> {
    return httpResource<RespuestaPatrimonio>(() => '/api/patrimonio');
  }

  consultarExposicionBtc(): HttpResourceRef<RespuestaExposicionBtc | undefined> {
    return httpResource<RespuestaExposicionBtc>(() => '/api/patrimonio/exposicion-btc');
  }
}
