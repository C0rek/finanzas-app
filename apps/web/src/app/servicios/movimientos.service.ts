import { Injectable } from '@angular/core';
import { Movimiento } from './modelos';
import { recursoCompartido } from './recurso-compartido';

// Único lugar que sabe de dónde salen los movimientos. El recurso es único para toda
// la app y se vuelve a pedir con "Sincronizar" (y al levantar la app).
@Injectable({ providedIn: 'root' })
export class MovimientosService {
  readonly movimientos = recursoCompartido<Movimiento[]>('/api/movimientos');
}
