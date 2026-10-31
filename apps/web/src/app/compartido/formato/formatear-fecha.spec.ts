import { claveMes, formatearFecha } from './formatear-fecha';

describe('formatearFecha', () => {
  const iso = '2026-10-29T14:32:00-03:00';

  it('arma cada formato del boceto', () => {
    expect(formatearFecha(iso, 'corta')).toBe('29 oct');
    expect(formatearFecha(iso, 'hora')).toBe('14:32');
    expect(formatearFecha(iso, 'completa')).toBe('29 oct 2026, 14:32 (UTC−3)');
    expect(formatearFecha(iso, 'mes')).toBe('Octubre 2026');
  });

  it('usa la hora de Argentina aunque la fecha venga en otra zona', () => {
    // 01:00 en UTC es 22:00 del día anterior en Argentina.
    expect(formatearFecha('2026-10-30T01:00:00Z', 'corta')).toBe('29 oct');
    expect(formatearFecha('2026-10-30T01:00:00Z', 'hora')).toBe('22:00');
  });
});

describe('claveMes', () => {
  it('devuelve año y mes', () => {
    expect(claveMes('2026-10-29T14:32:00-03:00')).toBe('2026-10');
  });
});
