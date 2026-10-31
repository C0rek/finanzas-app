import Decimal from 'decimal.js';
import { formatearDecimal } from '../../compartido/formato/formatear-decimal';
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
};

// Cuántos decimales mostrar de cada activo. Cuando exista el catálogo de activos en la API,
// este dato debería venir de ahí.
const DECIMALES_POR_ACTIVO: Record<string, number> = { BTC: 4, ETH: 4, SOL: 4, IBIT: 0 };
const DECIMALES_POR_DEFECTO = 2;

export type Categoria = 'operaciones' | 'liquidez' | 'futuros' | 'rewards';

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

export function categoria(m: Movimiento): Categoria {
  if (m.tipo === 'PNL_FUTUROS') return 'futuros';
  if (m.tipo === 'REWARD') return 'rewards';
  if (m.tipo === 'TRANSFER' || m.tipo === 'APORTE' || m.p2p) return 'liquidez';
  return 'operaciones';
}

// La etiqueta "Liquidez" se asigna sola (transferencias, P2P y aportes) y va primero.
export function etiquetas(m: Movimiento): { texto: string; automatica: boolean }[] {
  const automaticas = categoria(m) === 'liquidez' ? [{ texto: 'Liquidez', automatica: true }] : [];
  return [...automaticas, ...m.etiquetas.map((texto) => ({ texto, automatica: false }))];
}

export function decimalesDe(activo: string): number {
  return DECIMALES_POR_ACTIVO[activo] ?? DECIMALES_POR_DEFECTO;
}

// "+0,0120", "−2,0000", "0,0150" (las transferencias no suman ni restan: van sin signo).
export function formatearCantidad(m: Movimiento, conActivo = false): string {
  const restan = m.tipo === 'VENTA' || m.tipo === 'COMISION';
  const valor = restan ? new Decimal(m.cantidad).neg().toString() : m.cantidad;
  return formatearDecimal(valor, {
    decimales: decimalesDe(m.activo),
    signo: m.tipo !== 'TRANSFER',
    sufijo: conActivo ? ` ${m.activo}` : '',
  });
}

// "Bitunix" o, en una transferencia, "Bitunix → BingX".
export function donde(m: Movimiento): string {
  return m.cuentaDestino ? `${m.cuenta} → ${m.cuentaDestino}` : m.cuenta;
}
