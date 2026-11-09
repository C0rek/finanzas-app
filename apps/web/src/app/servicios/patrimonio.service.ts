import { Injectable } from '@angular/core';
import { RespuestaEvolucion, RespuestaExposicionBtc, RespuestaPatrimonio, RespuestaPosiciones } from './modelos';
import { recursoCompartido } from './recurso-compartido';

// httpResource hace la llamada HTTP y expone signals con su estado: cargando, error o valor.
// La URL pasa por el proxy de desarrollo (proxy.conf.json), que la manda a NestJS.
// Los recursos son únicos para toda la app: todas las pantallas comparten los mismos datos
// y solo se vuelven a pedir con "Sincronizar" (y al levantar la app).
@Injectable({ providedIn: 'root' })
export class PatrimonioService {
  readonly patrimonio = recursoCompartido<RespuestaPatrimonio>('/api/patrimonio');
  readonly posiciones = recursoCompartido<RespuestaPosiciones>('/api/posiciones');
  readonly evolucion = recursoCompartido<RespuestaEvolucion>('/api/patrimonio/evolucion');
  readonly exposicionBtc = recursoCompartido<RespuestaExposicionBtc>('/api/patrimonio/exposicion-btc');
}
