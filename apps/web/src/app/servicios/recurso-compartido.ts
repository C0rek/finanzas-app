import { httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Injector, runInInjectionContext } from '@angular/core';

// Un httpResource único para toda la app, creado recién la primera vez que alguien lo pide.
// Así una pantalla que solo usa posiciones no dispara los demás pedidos.
// Se usa como campo de un servicio root: readonly posiciones = recursoCompartido<T>('/api/posiciones');
// y se lee con servicio.posiciones().
export function recursoCompartido<T>(url: string): () => HttpResourceRef<T | undefined> {
  const injector = inject(Injector);
  let recurso: HttpResourceRef<T | undefined> | undefined;
  return () => (recurso ??= runInInjectionContext(injector, () => httpResource<T>(() => url)));
}
