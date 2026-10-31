import { Pipe, PipeTransform } from '@angular/core';
import { DecimalTexto } from '../../servicios/modelos';
import { claseSigno } from './formatear-decimal';

// Devuelve la clase CSS según el signo: <span [class]="valor | signo">
@Pipe({ name: 'signo' })
export class SignoPipe implements PipeTransform {
  transform(valor: DecimalTexto): 'positivo' | 'negativo' | 'cero' {
    return claseSigno(valor);
  }
}
