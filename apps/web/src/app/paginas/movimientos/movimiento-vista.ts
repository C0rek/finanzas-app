import Decimal from 'decimal.js';
import { decimalesVisibles, formatearDecimal } from '../../compartido/formato/formatear-decimal';
import { Movimiento, TipoMovimiento } from '../../servicios/modelos';

// Reglas de cómo se MUESTRA un movimiento en pantalla (textos, signos, agrupaciones).
// Son funciones sueltas y no un componente para poder testearlas sin dibujar nada.

const ETIQUETAS_TIPO: Record<TipoMovimiento, string> = {
  COMPRA: 'Compra',
  VENTA: 'Venta',
  TRANSFER: 'Transferencia',
  PNL_FUTUROS: 'PnL futuros',
  REWARD: 'Reward',
  APORTE: 'Aporte',
  COMISION: 'Comisión',
  AJUSTE: 'Ajuste',
  SALDO: 'Saldo',
};

// La categoría y los decimales de cada movimiento los decide la API (acá solo se muestran).
// "otros" no tiene pestaña: un saldo o una transferencia de un activo que no es liquidez
// (ej.: Saldo de BTC) se ve solo en Todos.
export type Categoria = Movimiento['categoria'];

export const CATEGORIAS: { clave: Categoria | 'todos'; etiqueta: string }[] = [
  { clave: 'todos', etiqueta: 'Todos' },
  { clave: 'operaciones', etiqueta: 'Operaciones' },
  { clave: 'liquidez', etiqueta: 'Liquidez' },
  { clave: 'futuros', etiqueta: 'Futuros' },
  { clave: 'rewards', etiqueta: 'Rewards' },
];

export function etiquetaTipo(m: Movimiento): string {
  return m.p2p ? `P2P · ${ETIQUETAS_TIPO[m.tipo].toLowerCase()}` : ETIQUETAS_TIPO[m.tipo];
}

// Una compra o venta que movió la liquidez (ej.: pagada con USDT) aparece también en Liquidez.
export function estaEn(m: Movimiento, clave: Categoria | 'todos'): boolean {
  return clave === 'todos' || m.categoria === clave || (clave === 'liquidez' && !!m.impactoPago);
}

// Activos que toca el movimiento: el propio y, si se sigue, el que se usó para pagar.
export function activosDe(m: Movimiento): string[] {
  return m.impactoPago ? [m.activo, m.impactoPago.activo] : [m.activo];
}

// La etiqueta "Liquidez" se asigna sola (saldos, transferencias, P2P y aportes de USDT) y va primero.
export function etiquetas(m: Movimiento): { texto: string; automatica: boolean }[] {
  const automaticas = m.categoria === 'liquidez' ? [{ texto: 'Liquidez', automatica: true }] : [];
  return [...automaticas, ...m.etiquetas.map((texto) => ({ texto, automatica: false }))];
}

// "+0,0120", "−2,0000", "0,0150" (las transferencias no suman ni restan: van sin signo) y
// "= 0,1599" en un saldo (fija la cantidad, no suma: con "+" parecería una compra).
export function formatearCantidad(m: Movimiento, conActivo = false): string {
  const restan = m.tipo === 'VENTA' || m.tipo === 'COMISION';
  const valor = restan ? new Decimal(m.cantidad).neg().toString() : m.cantidad;
  return formatearDecimal(valor, {
    decimales: decimalesVisibles(m.cantidad, m.decimales),
    signo: m.tipo !== 'TRANSFER' && m.tipo !== 'SALDO',
    prefijo: m.tipo === 'SALDO' ? '= ' : '',
    sufijo: conActivo ? ` ${m.activo}` : '',
  });
}

// "Bitunix" o, en una transferencia, "Bitunix → BingX".
export function donde(m: Movimiento): string {
  return m.cuentaDestino ? `${m.cuenta} → ${m.cuentaDestino}` : m.cuenta;
}
