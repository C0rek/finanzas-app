import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SincronizacionService } from './sincronizacion.service';

// Todos los pedidos que hace la app. Los datos son de mentira: acá solo importa el ida y vuelta.
const URLS = [
  '/api/patrimonio',
  '/api/posiciones',
  '/api/patrimonio/evolucion',
  '/api/patrimonio/exposicion-btc',
  '/api/movimientos',
];

function montar() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const sincro = TestBed.inject(SincronizacionService);
  const http = TestBed.inject(HttpTestingController);
  TestBed.tick();
  return { http, sincro };
}

// Responde todos los pedidos pendientes y deja pasar el giro mínimo del ícono.
async function responderTodo(http: HttpTestingController) {
  for (const url of URLS) http.expectOne(url).flush({}); // ⚠️ dato inventado
  await Promise.resolve();
  TestBed.tick();
  vi.advanceTimersByTime(600);
}

describe('SincronizacionService', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] }));
  afterEach(() => vi.useRealTimers());

  it('al levantar la app pide todos los datos y marca la sincronización', async () => {
    const { http, sincro } = montar();
    expect(sincro.sincronizando()).toBe(true);
    expect(sincro.ultima()).toBeNull();

    await responderTodo(http);
    expect(sincro.sincronizando()).toBe(false);
    expect(sincro.ultima()).not.toBeNull();
  });

  it('Sincronizar vuelve a pedir todo, aunque no esté en pantalla', async () => {
    const { http, sincro } = montar();
    await responderTodo(http);
    const anterior = sincro.ultima()!;

    vi.advanceTimersByTime(60_000);
    sincro.sincronizar();
    TestBed.tick();
    expect(sincro.sincronizando()).toBe(true);

    await responderTodo(http);
    expect(sincro.sincronizando()).toBe(false);
    expect(sincro.ultima()!.getTime()).toBeGreaterThan(anterior.getTime());
  });

  it('un segundo click mientras sincroniza no repite los pedidos', async () => {
    const { http, sincro } = montar();
    await responderTodo(http);

    sincro.sincronizar();
    sincro.sincronizar();
    TestBed.tick();
    for (const url of URLS) http.expectOne(url); // falla si hubiera dos
  });
});
