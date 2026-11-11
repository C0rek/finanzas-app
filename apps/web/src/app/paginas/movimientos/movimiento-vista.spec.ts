import { MOVIMIENTOS_PRUEBA } from './movimientos.fixture';
import { Movimiento } from '../../servicios/modelos';
import {
  activosDe,
  donde,
  estaEn,
  etiquetas,
  etiquetaTipo,
  formatearCantidad,
} from './movimiento-vista';

const buscar = (id: number): Movimiento => MOVIMIENTOS_PRUEBA.find((m) => m.id === id)!;
const compraBtc = buscar(9);
const p2p = buscar(8);
const transferencia = buscar(6);
const venta = buscar(5);
const compraIbit = buscar(3);

describe('movimiento-vista', () => {
  it('formatea la cantidad con el signo según el tipo', () => {
    expect(formatearCantidad(compraBtc)).toBe('+0,0120');
    expect(formatearCantidad(venta)).toBe('−2,0000');
    expect(formatearCantidad(transferencia)).toBe('300,00');
    expect(formatearCantidad(compraIbit)).toBe('+5');
    expect(formatearCantidad(compraBtc, true)).toBe('+0,0120 BTC');
  });

  it('agrega decimales si la cantidad se vería como 0', () => {
    expect(formatearCantidad({ ...compraBtc, cantidad: '0.00004' })).toBe('+0,00004');
    expect(formatearCantidad({ ...compraIbit, activo: 'AAA', cantidad: '0.0012' })).toBe('+0,001');
  });

  it('nombra el ajuste', () => {
    expect(etiquetaTipo({ ...compraBtc, tipo: 'AJUSTE' })).toBe('Ajuste');
  });

  it('nombra el tipo, incluido el P2P', () => {
    expect(etiquetaTipo(compraBtc)).toBe('Compra');
    expect(etiquetaTipo(p2p)).toBe('P2P · compra');
  });

  it('clasifica en las pestañas del boceto', () => {
    expect(compraBtc.categoria).toBe('operaciones');
    expect(p2p.categoria).toBe('liquidez');
    expect(transferencia.categoria).toBe('liquidez');
    expect(buscar(7).categoria).toBe('futuros');
    expect(buscar(4).categoria).toBe('rewards');
  });

  it('un saldo o una transferencia que no es liquidez (la API los marca "otros") va solo en Todos', () => {
    const saldoBtc = { ...transferencia, tipo: 'SALDO' as const, activo: 'BTC', categoria: 'otros' as const };
    expect(estaEn(saldoBtc, 'todos')).toBe(true);
    expect(estaEn(saldoBtc, 'liquidez')).toBe(false);
    expect(etiquetas(saldoBtc).some((e) => e.automatica)).toBe(false);
  });

  it('una compra que movió USDT seguido aparece también en Liquidez y en el filtro de USDT', () => {
    const conPago = { ...compraBtc, impactoPago: { activo: 'USDT', antes: '500', despues: '450' } };
    expect(estaEn(conPago, 'operaciones')).toBe(true);
    expect(estaEn(conPago, 'liquidez')).toBe(true);
    expect(estaEn(compraBtc, 'liquidez')).toBe(false);
    expect(activosDe(conPago)).toEqual(['BTC', 'USDT']);
    expect(activosDe(compraBtc)).toEqual(['BTC']);
  });

  it('agrega la etiqueta Liquidez automática primero', () => {
    expect(etiquetas(p2p)).toEqual([{ texto: 'Liquidez', automatica: true }]);
    expect(etiquetas(compraBtc)).toEqual([{ texto: 'DCA', automatica: false }]);
  });

  it('muestra origen y destino de una transferencia', () => {
    expect(donde(transferencia)).toBe('Bitunix → BingX');
    expect(donde(compraBtc)).toBe('Bitunix');
  });
});

describe('formatearCantidad · saldo', () => {
  it('un saldo fija la cantidad: va con "=" y sin signo', () => {
    const saldo = { ...buscar(6), tipo: 'SALDO' as const, activo: 'ETH', cantidad: '0.1599', decimales: 4 };
    expect(formatearCantidad(saldo)).toBe('= 0,1599');
    expect(formatearCantidad(saldo, true)).toBe('= 0,1599 ETH');
  });
});
