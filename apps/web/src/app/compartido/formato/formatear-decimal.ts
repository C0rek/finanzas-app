import Decimal from 'decimal.js';
import { DecimalTexto } from '../../servicios/modelos';

export interface OpcionesFormato {
  decimales?: number; // cantidad fija de decimales (por defecto 0)
  signo?: boolean; // mostrar "+" en positivos (los negativos siempre llevan "−")
  prefijo?: string; // "US$ "
  sufijo?: string; // " %", " BTC"
}

// Formatea un decimal al estilo argentino: punto de miles y coma decimal.
// Trabaja sobre el texto con decimal.js, sin pasar nunca por number (float).
//   formatearDecimal('18420', { prefijo: 'US$ ' })   → "US$ 18.420"
//   formatearDecimal('-95', { signo: true })         → "−95"
//   formatearDecimal('58', { decimales: 1, sufijo: ' %' }) → "58,0 %"
export function formatearDecimal(valor: DecimalTexto, opciones: OpcionesFormato = {}): string {
  const { decimales = 0, signo = false, prefijo = '', sufijo = '' } = opciones;
  const numero = new Decimal(valor);
  const [entero, fraccion] = numero.abs().toFixed(decimales).split('.');
  const enteroConMiles = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const cuerpo = fraccion ? `${enteroConMiles},${fraccion}` : enteroConMiles;

  // El signo se decide sobre el valor ya redondeado, para no mostrar "−0".
  const redondeado = new Decimal(numero.toFixed(decimales));
  let marca = '';
  if (redondeado.isNegative() && !redondeado.isZero()) marca = '−';
  else if (signo && redondeado.greaterThan(0)) marca = '+';

  return `${marca}${prefijo}${cuerpo}${sufijo}`;
}

// Para colorear resultados: verde si gana, rojo si pierde, gris si es cero.
export function claseSigno(valor: DecimalTexto): 'positivo' | 'negativo' | 'cero' {
  const numero = new Decimal(valor);
  if (numero.isZero()) return 'cero';
  return numero.isNegative() ? 'negativo' : 'positivo';
}
