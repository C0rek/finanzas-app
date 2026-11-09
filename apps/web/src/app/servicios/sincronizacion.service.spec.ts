import { httpResource, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { sincronizable, SincronizacionService } from './sincronizacion.service';

// Card de mentira con un recurso registrado, como las del dashboard.
@Component({ selector: 'app-card-prueba', template: '' })
class CardPrueba {
  readonly recurso = sincronizable(httpResource<{ valor: string }>(() => '/api/prueba'));
}

function montar() {
  TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
  const fixture = TestBed.createComponent(CardPrueba);
  const http = TestBed.inject(HttpTestingController);
  const sincro = TestBed.inject(SincronizacionService);
  fixture.detectChanges();
  TestBed.tick();
  return { fixture, http, sincro };
}

describe('SincronizacionService', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'Date'] }));
  afterEach(() => vi.useRealTimers());

  it('vuelve a pedir los datos y avisa cuándo terminó', async () => {
    const { fixture, http, sincro } = montar();
    http.expectOne('/api/prueba').flush({ valor: '1' }); // ⚠️ dato inventado
    await fixture.whenStable();

    sincro.sincronizar();
    TestBed.tick();
    expect(sincro.sincronizando()).toBe(true);

    http.expectOne('/api/prueba').flush({ valor: '2' });
    await fixture.whenStable();
    TestBed.tick();
    vi.advanceTimersByTime(600); // el giro mínimo del ícono
    expect(sincro.sincronizando()).toBe(false);
    expect(sincro.ultima()).not.toBeNull();
    expect(fixture.componentInstance.recurso.value()).toEqual({ valor: '2' });
  });

  it('un segundo click mientras sincroniza no repite los pedidos', async () => {
    const { fixture, http, sincro } = montar();
    http.expectOne('/api/prueba').flush({ valor: '1' });
    await fixture.whenStable();

    sincro.sincronizar();
    sincro.sincronizar();
    TestBed.tick();
    http.expectOne('/api/prueba'); // falla si hubiera dos
  });

  it('una card que se destruye deja de recargarse', async () => {
    const { fixture, http, sincro } = montar();
    http.expectOne('/api/prueba').flush({ valor: '1' });
    await fixture.whenStable();
    fixture.destroy();

    sincro.sincronizar();
    TestBed.tick();
    http.expectNone('/api/prueba');
  });
});
