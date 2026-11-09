import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Movimiento, RespuestaPosiciones } from '../../../../servicios/modelos';
import { TablaPosiciones } from './tabla-posiciones';

// ⚠️ Datos inventados para el test.
const RESPUESTA: RespuestaPosiciones = {
  calculadoEn: '2026-03-01T15:00:00.000Z',
  movimientosHasta: '2026-02-20T13:00:00.000Z',
  parcial: true,
  posiciones: [
    { activo: 'AAA', cantidad: '2', ubicacion: 'Binance', categoria: 'Cripto', precioUsd: '150', precioPromedioUsd: '100.00000000', valorUsd: '300.00', noRealizadaUsd: '100.00', noRealizadaPct: '50.00', realizadaUsd: '25.00', cuentas: [{ cuenta: 'Binance', cantidad: '1.5', valorUsd: '225.00' }, { cuenta: 'IOL', cantidad: '0.5', valorUsd: '75.00' }] },
    { activo: 'BBB-TOK', cantidad: '0.5', ubicacion: 'IOL', categoria: 'CEDEAR', precioUsd: '100', precioPromedioUsd: '0.01234567', valorUsd: '50.00', noRealizadaUsd: '-10.00', noRealizadaPct: '-16.67', realizadaUsd: null, cuentas: [] },
    { activo: 'POLVO', cantidad: '0.001', ubicacion: 'Binance', categoria: 'Cripto', precioUsd: '500', precioPromedioUsd: null, valorUsd: '0.50', noRealizadaUsd: null, noRealizadaPct: null, realizadaUsd: null, cuentas: [] },
  ],
  total: { valorUsd: '350.00', noRealizadaUsd: '90.00', costoUsd: '260.00' },
  avisos: { desactualizados: [], sinValorizar: [], sinPrecioPromedio: [], saldosNegativos: [] },
};

function montar(limite: number | null = null) {
  TestBed.configureTestingModule({
    imports: [TablaPosiciones],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(TablaPosiciones);
  fixture.componentRef.setInput('limite', limite);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  TestBed.tick();
  const pedido = http.expectOne('/api/posiciones');
  const el = fixture.nativeElement as HTMLElement;
  const refrescar = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, pedido, el, texto: () => el.textContent ?? '', refrescar };
}

describe('TablaPosiciones', () => {
  it('muestra cada posición y el total', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    const filas = [...el.querySelectorAll('tbody tr')].map((f) => f.textContent ?? '');
    expect(filas).toHaveLength(3);
    expect(filas[0]).toContain('AAA');
    expect(filas[0]).toContain('Binance');
    expect(filas[0]).toContain('Cripto');
    expect(filas[0]).toContain('150,00'); // precio de mercado
    expect(filas[0]).toContain('100,00');
    expect(filas[0]).toContain('300,00'); // monto actual con 2 decimales
    expect(filas[0]).toContain('+$ 100');
    expect(filas[0]).toContain('+50,00 %');
    expect(filas[1]).toContain('−$ 10');
    expect(filas[1]).toContain('−16,67 %');
  });

  it('muestra la cantidad con su moneda', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    const cantidades = [...el.querySelectorAll('tbody tr')].map((f) => f.querySelectorAll('td')[3].textContent?.replace(/\s+/g, ' ').trim());
    expect(cantidades).toEqual(['2,00 AAA', '0,5000 BBB', '0,00100000 POLVO']);
  });

  it('el switch oculta los saldos menores a US$ 1 sin cambiar el total', async () => {
    localStorage.removeItem('posiciones.ocultarChicos');
    const { pedido, el, texto, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    const sw = el.querySelector<HTMLButtonElement>('[role="switch"]')!;
    expect(sw.getAttribute('aria-checked')).toBe('false');
    sw.click();
    await refrescar();
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(texto()).not.toContain('POLVO');
    expect(texto()).not.toContain('saldo oculto');
    expect(el.querySelector('tfoot')?.textContent).toContain('350,00');
    localStorage.removeItem('posiciones.ocultarChicos');
  });

  it('dice cuándo se actualizaron los datos', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(texto()).toContain('Actualizado: precios de las 12:00');
    expect(texto()).toContain('último movimiento del 20 feb 2026');
  });

  it('muestra el activo tokenizado sin el sufijo -TOK', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(el.querySelectorAll('tbody .activo')[1].textContent?.trim()).toBe('BBB');
    expect(el.querySelector('tfoot')?.textContent).toContain('350');
    expect(el.querySelector('tfoot')?.textContent).toContain('+90');
  });

  it('muestra la no realizada con 2 decimales', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(el.querySelectorAll('tbody tr')[0].textContent).toContain('+$ 100,00');
    expect(el.querySelectorAll('tbody tr')[1].textContent).toContain('−$ 10,00');
    expect(el.querySelector('tfoot')?.textContent).toContain('+90,00');
  });

  it('con límite muestra solo las primeras y ofrece ver todas', async () => {
    const { pedido, el, texto, refrescar } = montar(1);
    pedido.flush(RESPUESTA);
    await refrescar();
    const filas = el.querySelectorAll('tbody tr');
    expect(filas).toHaveLength(1);
    expect(filas[0].textContent).toContain('AAA');
    expect(texto()).toContain('Mostrando 1 de 3');
    expect(el.querySelector('a[href="/posiciones"]')).not.toBeNull();
    // El total sigue sumando todas las posiciones, no solo las visibles.
    expect(el.querySelector('tfoot')?.textContent).toContain('350');
  });

  it('sin límite muestra todas y no ofrece ver todas', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(el.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(el.querySelector('a[href="/posiciones"]')).toBeNull();
  });

  it('muestra más decimales en precios menores a 1', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(el.querySelectorAll('tbody tr')[1].textContent).toContain('0,0123');
  });

  it('muestra una raya en lo que no se conoce, sin inventar un 0', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush({
      ...RESPUESTA,
      posiciones: [{ activo: 'CCC', cantidad: '3', ubicacion: 'IOL', categoria: 'Fondo', precioUsd: null, precioPromedioUsd: null, valorUsd: null, noRealizadaUsd: null, noRealizadaPct: null }],
    });
    await refrescar();
    const celdas = [...el.querySelectorAll('tbody td.numero')].map((c) => c.textContent?.replace(/\s+/g, ' ').trim());
    expect(celdas).toEqual(['—', '3,00 CCC', '—', '—', '—', '—']);
  });

  it('aclara que es parcial', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(texto()).toContain('Incluye solo activos spot');
  });

  it('nombra cada aviso', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({
      ...RESPUESTA,
      avisos: {
        desactualizados: [{ simbolo: 'VIEJO', precioDel: '2026-02-10T15:00:00.000Z' }],
        sinValorizar: ['SINPRECIO'],
        sinPrecioPromedio: ['SINCOSTO'],
        saldosNegativos: ['NEGATIVO'],
      },
    });
    await refrescar();
    expect(texto()).toContain('VIEJO (10 feb)');
    expect(texto()).toContain('SINPRECIO');
    expect(texto()).toContain('SINCOSTO');
    expect(texto()).toContain('NEGATIVO');
  });

  it('mientras carga no muestra la tabla', () => {
    const { texto, el } = montar();
    expect(texto()).toContain('Calculando');
    expect(el.querySelector('table')).toBeNull();
  });

  it('si el back falla muestra un error y ningún dato', async () => {
    const { pedido, texto, el, refrescar } = montar();
    pedido.flush({ mensaje: 'x' }, { status: 503, statusText: 'No disponible' });
    await refrescar();
    expect(texto()).toContain('No pudimos calcular tus posiciones');
    expect(el.querySelector('table')).toBeNull();
  });

  it('sin posiciones lo explica en vez de mostrar una tabla vacía', async () => {
    const { pedido, texto, el, refrescar } = montar();
    pedido.flush({ ...RESPUESTA, posiciones: [], total: { valorUsd: '0.00', noRealizadaUsd: '0.00' } });
    await refrescar();
    expect(texto()).toContain('Todavía no hay activos cargados');
    expect(el.querySelector('table')).toBeNull();
  });
});

describe('TablaPosiciones · panel lateral', () => {
  // ⚠️ Datos inventados para el test.
  const movimiento = (id: number, activo: string, dia: number): Movimiento => ({
    id, fecha: `2026-02-${String(dia).padStart(2, '0')}T12:00:00.000Z`, tipo: 'COMPRA', p2p: false, activo,
    cantidad: '0.1', moneda: 'USD', precio: '100', total: '-10', precioUsd: '100', totalUsd: '-10',
    cuenta: 'Binance', cuentaDestino: null, mercado: null, pagadoCon: null, comision: null,
    origen: 'IMPORTADO', idExterno: null, etiquetas: [], impacto: null, nota: null,
  });

  async function abrir() {
    const m = montar();
    m.pedido.flush(RESPUESTA);
    await m.refrescar();
    (m.el.querySelector('tbody tr') as HTMLElement).click();
    // Sin esperar: whenStable no termina mientras el pedido de movimientos siga abierto.
    m.fixture.detectChanges();
    TestBed.tick();
    const http = TestBed.inject(HttpTestingController);
    // 7 de AAA (del 1 al 7 de febrero) y 1 de otro activo.
    const lista = [1, 2, 3, 4, 5, 6, 7].map((d) => movimiento(d, 'AAA', d)).concat(movimiento(99, 'BBB-TOK', 28));
    http.expectOne('/api/movimientos').flush(lista);
    await m.refrescar();
    const panel = () => m.el.querySelector('app-detalle-posicion') as HTMLElement | null;
    return { ...m, panel };
  }

  it('al hacer click en una posición abre el panel con su detalle', async () => {
    const { panel } = await abrir();
    const texto = panel()!.textContent ?? '';
    expect(texto).toContain('Binance');
    expect(texto).toContain('IOL');
    expect(texto).toContain('85,71 % de la cartera'); // 300 de 350
    expect(texto).toContain('+US$ 25,00'); // realizada
    expect(texto).toContain('Pendiente'); // futuros sin datos
  });

  it('muestra solo los últimos 5 movimientos del activo', async () => {
    const { panel } = await abrir();
    const filas = [...panel()!.querySelectorAll('.movimientos li')].map((li) => li.textContent ?? '');
    expect(filas).toHaveLength(5);
    expect(filas.every((f) => f.includes('AAA'))).toBe(true);
    const link = panel()!.querySelector('a.enlace') as HTMLAnchorElement;
    expect(link.getAttribute('href')).toBe('/movimientos?activo=AAA');
  });

  it('click otra vez en la misma fila cierra el panel', async () => {
    const { el, panel, refrescar } = await abrir();
    (el.querySelector('tbody tr') as HTMLElement).click();
    await refrescar();
    expect(panel()).toBeNull();
  });
});
