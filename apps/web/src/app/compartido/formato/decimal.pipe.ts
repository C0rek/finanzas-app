import { Pipe, PipeTransform } from '@angular/core';
import { DecimalTexto } from '../../servicios/modelos';
import { formatearDecimal, OpcionesFormato } from './formatear-decimal';

// Un pipe transforma un valor para mostrarlo en el HTML:
//   {{ patrimonio.totalUsd | decimal: { prefijo: 'US$ ' } }}  →  US$ 18.420
@Pipe({ name: 'decimal' })
export class DecimalPipe implements PipeTransform {
  transform(valor: DecimalTexto, opciones?: OpcionesFormato): string {
    return formatearDecimal(valor, opciones);
  }
}
