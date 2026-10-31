import { MOVIMIENTOS_PRUEBA } from '../../servicios/datos-prueba/movimientos';
import { Movimiento } from '../../servicios/modelos';
import { categoria, donde, etiquetas, etiquetaTipo, formatearCantidad } from './movimiento-vista';

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

  it('nombra el tipo, incluido el P2P', () => {
    expect(etiquetaTipo(compraBtc)).toBe('Compra');
    expect(etiquetaTipo(p2p)).toBe('P2P · compra');
  });

  it('clasifica en las pestañas del boceto', () => {
    expect(categoria(compraBtc)).toBe('operaciones');
    expect(categoria(p2p)).toBe('liquidez');
    expect(categoria(transferencia)).toBe('liquidez');
    expect(categoria(buscar(7))).toBe('futuros');
    expect(categoria(buscar(4))).toBe('rewards');
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
