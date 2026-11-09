import { httpResource, HttpResourceRef } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Movimiento } from './modelos';

// Único lugar que sabe de dónde salen los movimientos. Se llama desde un componente,
// así se vuelve a consultar cada vez que se entra a la pantalla.
@Injectable({ providedIn: 'root' })
export class MovimientosService {
  consultar(): HttpResourceRef<Movimiento[] | undefined> {
    return httpResource<Movimiento[]>(() => '/api/movimientos');
  }
}
