import { TestBed } from '@angular/core/testing';
import { BarraSuperior } from './barra-superior';

describe('BarraSuperior', () => {
  it('muestra el logotipo de Nonio con un nombre accesible', () => {
    const fixture = TestBed.createComponent(BarraSuperior);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    const logotipo = el.querySelector('.logotipo');
    expect(logotipo?.getAttribute('aria-label')).toBe('Nonio');
    expect(logotipo?.getAttribute('role')).toBe('img');
    expect(logotipo?.textContent?.trim()).toBe('nonıo');
    expect(el.querySelector('.logotipo-marca')).not.toBeNull();
  });
});
