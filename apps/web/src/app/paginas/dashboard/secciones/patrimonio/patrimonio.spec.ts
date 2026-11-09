import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { RespuestaPatrimonio } from '../../../../servicios/modelos';
import { Patrimonio } from './patrimonio';

// ⚠️ Datos inventados para el test.
const RESPUESTA: RespuestaPatrimonio = {
  totalUsd: '500.00',
  calculadoEn: '2026-03-01T15:00:00.000Z',
  parcial: true,
  desglose: { inversionUsd: '500.00', liquidezUsd: '0.00', colchonUsd: '0.00' },
  activos: [
    { simbolo: 'AAA', grupo: 'POSICION', cantidad: '1', precioUsd: '500', valorUsd: '500.00', origenPrecio: 'API', precioDel: '2026-03-01T15:00:00.000Z' },
  ],
  avisos: { desactualizados: [], sinValorizar: [], saldosNegativos: [] },
};

function montar() {
  TestBed.configureTestingModule({
    imports: [Patrimonio],
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  const fixture = TestBed.createComponent(Patrimonio);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  TestBed.tick();
  const pedido = http.expectOne('/api/patrimonio');
  const texto = () => (fixture.nativeElement as HTMLElement).textContent ?? '';
  const refrescar = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { fixture, pedido, texto, refrescar };
}

describe('Patrimonio', () => {
  it('muestra el total, la leyenda y la cartera con el mismo total', async () => {
    const { pedido, texto, refrescar, fixture } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.valor')?.textContent).toContain('$ 500');
    expect(el.querySelector('.monto')?.textContent).toContain('$ 500');
    expect(texto()).toContain('Cartera de inversión');
    expect(texto()).not.toContain('Incluye solo activos spot');
  });

  it('separa la cartera de inversión (con la liquidez adentro) y el colchón de ahorro', async () => {
    const { pedido, refrescar, fixture } = montar();
    pedido.flush({
      ...RESPUESTA,
      totalUsd: '1800.00',
      desglose: { inversionUsd: '800.00', liquidezUsd: '300.00', colchonUsd: '1000.00' },
    });
    await refrescar();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.valor')?.textContent).toContain('$ 1.800');
    const partes = [...el.querySelectorAll('.mitad')].map((m) => [
      m.querySelector('.etiqueta')?.textContent?.trim(),
      m.querySelector('.monto')?.textContent?.trim(),
    ]);
    expect(partes).toEqual([
      ['Cartera de inversión', '$ 800'],
      ['Colchón de ahorro', '$ 1.000'],
    ]);
  });

  it('muestra a qué hora se calculó, en hora de Argentina', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(texto()).toContain('Calculado a las 12:00');
  });

  it('al volver a la pantalla usa los datos ya cargados (se refrescan con Sincronizar)', async () => {
    const { fixture, pedido, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    fixture.destroy();

    const otra = TestBed.createComponent(Patrimonio);
    otra.detectChanges();
    TestBed.tick();
    TestBed.inject(HttpTestingController).expectNone('/api/patrimonio');
  });

  it('no muestra bienes físicos y fiat', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush(RESPUESTA);
    await refrescar();
    expect(texto()).not.toContain('Bienes físicos');
  });

  it('mientras carga no muestra montos', () => {
    const { texto } = montar();
    expect(texto()).toContain('Calculando');
    expect(texto()).not.toContain('$');
  });

  it('si el back falla muestra un error y ningún monto', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({ mensaje: 'x' }, { status: 503, statusText: 'No disponible' });
    await refrescar();
    expect(texto()).toContain('No pudimos calcular tu patrimonio');
    expect(texto()).not.toContain('$');
  });

  it('con la base vacía lo explica en vez de mostrar $ 0', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({ ...RESPUESTA, totalUsd: '0.00', activos: [] });
    await refrescar();
    expect(texto()).toContain('Todavía no hay activos cargados');
    expect(texto()).not.toContain('$');
  });

  it('si nada se pudo valorizar no muestra $ 0 ni dice que está vacío', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({
      ...RESPUESTA,
      totalUsd: '0.00',
      activos: [],
      avisos: { desactualizados: [], sinValorizar: ['ZZZ'], saldosNegativos: [] },
    });
    await refrescar();
    expect(texto()).toContain('ZZZ');
    expect(texto()).not.toContain('Todavía no hay activos');
    expect(texto()).not.toContain('$');
  });

  it('nombra cada aviso, con la fecha de los precios desactualizados', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({
      ...RESPUESTA,
      avisos: {
        desactualizados: [{ simbolo: 'VIEJO', precioDel: '2026-02-10T15:00:00.000Z' }],
        sinValorizar: ['SINPRECIO'],
        saldosNegativos: ['NEGATIVO'],
      },
    });
    await refrescar();
    expect(texto()).toContain('VIEJO');
    expect(texto()).toContain('10 feb');
    expect(texto()).toContain('SINPRECIO');
    expect(texto()).toContain('NEGATIVO');
  });

  it('muestra la fecha de los valores manuales', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush({
      ...RESPUESTA,
      activos: [{ ...RESPUESTA.activos[0], simbolo: 'FONDO', origenPrecio: 'MANUAL', precioDel: '2026-01-15T15:00:00.000Z' }],
    });
    await refrescar();
    expect(texto()).toContain('FONDO');
    expect(texto()).toContain('15 ene');
  });
});
