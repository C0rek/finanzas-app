import { TestBed } from '@angular/core/testing';
import { Avisos } from './avisos';

// Datos de prueba inventados.
function montar(avisos: string[]) {
  const fixture = TestBed.createComponent(Avisos);
  fixture.componentRef.setInput('avisos', avisos);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('Avisos', () => {
  it('arranca plegado y resume cuántos avisos hay', () => {
    const el = montar(['Precio desactualizado: AAA (1 oct)', 'Sin valorizar, no suman: ZZZ']);
    expect(el.querySelector('details')?.open).toBe(false);
    expect(el.querySelector('summary')?.textContent).toContain('2 avisos sobre estos datos');
    expect(el.querySelectorAll('li')).toHaveLength(2);
  });

  it('en singular con un solo aviso', () => {
    const el = montar(['Sin valorizar, no suman: ZZZ']);
    expect(el.querySelector('summary')?.textContent).toContain('1 aviso sobre estos datos');
  });

  it('sin avisos no dibuja nada', () => {
    const el = montar([]);
    expect(el.querySelector('details')).toBeNull();
  });
});
