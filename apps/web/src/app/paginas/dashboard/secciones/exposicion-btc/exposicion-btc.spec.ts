import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RespuestaExposicionBtc } from '../../../../servicios/modelos';
import { ExposicionBtc } from './exposicion-btc';

// ⚠️ Datos inventados para el test.
const RESPUESTA: RespuestaExposicionBtc = {
  calculadoEn: '2026-03-01T15:00:00.000Z',
  parcial: true,
  carteraUsd: '1200.00',
  precioBtcUsd: '50000',
  porcentaje: '58.33',
  cantidadBtc: '0.01400000',
  valorUsd: '700.00',
  partes: [
    { etiqueta: 'Spot', porcentaje: '41.67', cantidadBtc: '0.01000000', ubicacion: 'Binance' },
    { etiqueta: 'Futuros (margen)', porcentaje: '0.00', cantidadBtc: '0.00000000', ubicacion: 'No contemplado' },
    { etiqueta: 'IBIT', porcentaje: '16.67', cantidadBtc: '0.00400000', ubicacion: 'IOL' },
    { etiqueta: 'Cold wallet', porcentaje: '0.00', cantidadBtc: '0.00000000', ubicacion: 'No contemplado' },
  ],
  resto: { porcentaje: '41.67', detalle: 'AAA, BBB y 1 más' },
  avisos: { desactualizados: [], sinValorizar: [] },
};

function montar() {
  TestBed.configureTestingModule({
    imports: [ExposicionBtc],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(ExposicionBtc);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  TestBed.tick();
  const pedido = http.expectOne('/api/patrimonio/exposicion-btc');
  const el = fixture.nativeElement as HTMLElement;
  const refrescar = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, pedido, el, texto: () => el.textContent ?? '', refrescar };
}

describe('ExposicionBtc', () => {
  it('muestra el porcentaje, la cantidad, el valor y la cartera', async () => {
    const { pedido, texto, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(el.querySelector('.porcentaje')?.textContent).toContain('58,3 %');
    expect(texto()).toContain('0,0140 BTC');
    expect(texto()).toContain('US$ 700');
    expect(texto()).toContain('US$ 50.000');
    expect(texto()).toContain('Sobre tu cartera de inversión de US$ 1.200');
  });

  it('muestra futuros y cold wallet en 0 como no contemplados', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    const items = [...el.querySelectorAll('.desglose li')].map((li) => li.textContent ?? '');
    for (const etiqueta of ['Futuros (margen)', 'Cold wallet']) {
      const item = items.find((i) => i.includes(etiqueta))!;
      expect(item).toContain('0,0 %');
      expect(item).toContain('No contemplado');
    }
  });

  it('no dibuja segmentos de las partes en 0, y conserva el color de cada parte', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    const segmentos = [...el.querySelectorAll<HTMLElement>('.barra .segmento:not(.resto)')];
    expect(segmentos.map((s) => s.style.background)).toEqual(['var(--color-chart)', 'var(--color-chart-3)']);
    expect(segmentos.map((s) => s.style.width)).toEqual(['41.67%', '16.67%']);
  });

  it('aclara que es parcial y a qué hora se calculó', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(texto()).toContain('Incluye solo activos spot');
    expect(texto()).toContain('Calculado a las 12:00');
  });

  it('mientras carga no muestra montos', () => {
    const { texto } = montar();
    expect(texto()).toContain('Calculando');
    expect(texto()).not.toContain('US$');
  });

  it('si el back falla muestra un error y ningún dato', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({ mensaje: 'x' }, { status: 503, statusText: 'No disponible' });
    await refrescar();
    expect(texto()).toContain('No pudimos calcular tu exposición');
    expect(texto()).not.toContain('%');
    expect(texto()).not.toContain('US$');
  });

  it('sin precio de Bitcoin lo explica en vez de mostrar 0 %', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({ ...RESPUESTA, precioBtcUsd: null });
    await refrescar();
    expect(texto()).toContain('No pudimos obtener el precio de Bitcoin');
    expect(texto()).not.toContain('%');
  });

  it('con la cartera vacía lo explica en vez de mostrar 0 %', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({ ...RESPUESTA, carteraUsd: '0.00', porcentaje: '0.00' });
    await refrescar();
    expect(texto()).toContain('Todavía no hay activos cargados');
    expect(texto()).not.toContain('%');
  });

  it('avisa los precios desactualizados y los activos sin valorizar', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({
      ...RESPUESTA,
      avisos: {
        desactualizados: [{ simbolo: 'BTC', precioDel: '2026-02-10T15:00:00.000Z' }],
        sinValorizar: ['IBIT'],
      },
    });
    await refrescar();
    expect(texto()).toContain('BTC (10 feb)');
    expect(texto()).toContain('IBIT');
  });

  it('al volver a la pantalla usa los datos ya cargados (se refrescan con Sincronizar)', async () => {
    const { fixture, pedido, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    fixture.destroy();

    const otra = TestBed.createComponent(ExposicionBtc);
    otra.detectChanges();
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectNone('/api/patrimonio/exposicion-btc');
  });
});
