import { claseSigno, formatearDecimal } from './formatear-decimal';

describe('formatearDecimal', () => {
  it('agrega punto de miles y prefijo', () => {
    expect(formatearDecimal('18420', { prefijo: 'US$ ' })).toBe('US$ 18.420');
    expect(formatearDecimal('1234567')).toBe('1.234.567');
  });

  it('usa coma decimal con decimales fijos', () => {
    expect(formatearDecimal('61200', { decimales: 2 })).toBe('61.200,00');
    expect(formatearDecimal('58', { decimales: 1, sufijo: ' %' })).toBe('58,0 %');
    expect(formatearDecimal('0.1240', { decimales: 4, sufijo: ' BTC' })).toBe('0,1240 BTC');
  });

  it('pone el signo antes del prefijo', () => {
    expect(formatearDecimal('1135', { signo: true, prefijo: 'US$ ' })).toBe('+US$ 1.135');
    expect(formatearDecimal('-95', { signo: true })).toBe('−95');
  });

  it('no muestra signo en cero, ni siquiera si redondea a cero', () => {
    expect(formatearDecimal('0', { signo: true })).toBe('0');
    expect(formatearDecimal('-0.4', { signo: true })).toBe('0');
  });

  it('redondea sin errores de float', () => {
    // Con number, 1.005 se guarda como 1.00499999... y redondearía a 1,00.
    expect(formatearDecimal('1.005', { decimales: 2 })).toBe('1,01');
  });
});

describe('claseSigno', () => {
  it('clasifica positivos, negativos y cero', () => {
    expect(claseSigno('740')).toBe('positivo');
    expect(claseSigno('-95')).toBe('negativo');
    expect(claseSigno('0')).toBe('cero');
  });
});
