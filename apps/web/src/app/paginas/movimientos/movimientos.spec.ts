import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Movimiento } from '../../servicios/modelos';
import { Movimientos } from './movimientos';

// ⚠️ Datos inventados para el test.
const base: Movimiento = {
  id: 1,
  fecha: '2026-03-10T15:00:00.000Z',
  tipo: 'COMPRA',
  p2p: false,
  activo: 'AAA',
  categoria: 'operaciones',
  decimales: 2,
  cantidad: '2',
  moneda: 'USD',
  precio: '100',
  total: '-200',
  precioUsd: '100',
  totalUsd: '-200',
  cuenta: 'Binance',
  cuentaDestino: null,
  mercado: null,
  pagadoCon: null,
  comision: { monto: '0.5', activo: 'USDT' },
  origen: 'IMPORTADO',
  idExterno: 'x1',
  etiquetas: [],
  impacto: { antes: '0', despues: '2' },
  nota: null,
};
const enPesos: Movimiento = {
  ...base,
  id: 2,
  fecha: '2026-03-05T15:00:00.000Z',
  activo: 'BBB',
  moneda: 'ARS',
  precio: '5000',
  total: '-10000',
  precioUsd: null,
  totalUsd: null,
  comision: { monto: '100', activo: 'ARS' },
  idExterno: 'x2',
};

function montar() {
  TestBed.configureTestingModule({
    imports: [Movimientos],
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
  const fixture = TestBed.createComponent(Movimientos);
  const http = TestBed.inject(HttpTestingController);
  fixture.detectChanges();
  TestBed.tick();
  const pedido = http.expectOne('/api/movimientos');
  // El botón Sincronizar levanta todos los datos de la app; los que no son de esta pantalla
  // se responden vacíos para que no queden pedidos colgados.
  http.match((r) => r.url !== '/api/movimientos').forEach((p) => p.flush({}));
  const el = fixture.nativeElement as HTMLElement;
  const refrescar = async () => {
    await fixture.whenStable();
    fixture.detectChanges();
  };
  return { pedido, el, texto: () => el.textContent ?? '', refrescar };
}

describe('Movimientos', () => {
  it('muestra los movimientos de la API y resume el mes', async () => {
    const { pedido, el, texto, refrescar } = montar();
    pedido.flush([base, enPesos]);
    await refrescar();
    expect(el.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(texto()).toContain('2 movimientos en marzo');
    expect(texto()).toContain('historial parcial');
    expect(texto()).not.toContain('datos de prueba');
  });

  it('marca el origen como importado', async () => {
    const { pedido, texto, refrescar } = montar();
    pedido.flush([base]);
    await refrescar();
    expect(texto()).toContain('Importado de un export');
  });

  it('el detalle muestra la comisión en su activo', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush([base]);
    await refrescar();
    expect(el.querySelector('app-detalle-movimiento')?.textContent).toContain('0,50 USDT');
  });

  it('un movimiento en pesos sin USD muestra raya en la tabla y los pesos en el detalle', async () => {
    const { pedido, el, refrescar } = montar();
    pedido.flush([enPesos]);
    await refrescar();
    const celdas = [...el.querySelectorAll('tbody tr td.numero')].map((c) => c.textContent?.trim());
    expect(celdas.slice(1)).toEqual(['—', '—']);
    const detalle = el.querySelector('app-detalle-movimiento')?.textContent ?? '';
    expect(detalle).toContain('ARS 5.000');
    expect(detalle).toContain('ARS 10.000');
    expect(detalle).not.toContain('$');
  });

  it('mientras carga no muestra la tabla', () => {
    const { el, texto } = montar();
    expect(texto()).toContain('Cargando movimientos');
    expect(el.querySelector('table')).toBeNull();
  });

  it('si el back falla muestra un error, nunca datos de prueba', async () => {
    const { pedido, el, texto, refrescar } = montar();
    pedido.flush({ mensaje: 'x' }, { status: 503, statusText: 'No disponible' });
    await refrescar();
    expect(texto()).toContain('No pudimos cargar tus movimientos');
    expect(el.querySelector('table')).toBeNull();
  });

  it('sin movimientos lo explica', async () => {
    const { pedido, el, texto, refrescar } = montar();
    pedido.flush([]);
    await refrescar();
    expect(texto()).toContain('Todavía no hay movimientos cargados');
    expect(el.querySelector('table')).toBeNull();
  });
});
