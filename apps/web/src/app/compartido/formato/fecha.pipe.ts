import { Pipe, PipeTransform } from '@angular/core';
import { FormatoFecha, formatearFecha } from './formatear-fecha';

//   {{ movimiento.fecha | fecha: 'corta' }}  →  29 oct
@Pipe({ name: 'fecha' })
export class FechaPipe implements PipeTransform {
  transform(iso: string, formato: FormatoFecha): string {
    return formatearFecha(iso, formato);
  }
}
