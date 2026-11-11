---
name: crear-pantalla
description: Crear o rediseñar una pantalla (página) de la web de Nonio en Angular siguiendo el estilo de las páginas que ya existen. Usar cuando pida una pantalla, página, vista, sección nueva, panel o modal en apps/web.
---

# Crear una pantalla en Nonio (apps/web)

Seguí estos pasos en orden. No exploramos el repo de más: lo necesario está acá y en `docs/RESUMEN.md`.

## 1. Antes de codear
- **Referencia visual = la app actual**, no los bocetos de Pencil ni las capturas de `design/` (están desactualizados, ignoralos). Copiá la estructura y el estilo de las páginas existentes: `paginas/movimientos` (tabla + panel de detalle), `paginas/posiciones` y `paginas/dashboard` (cards en grilla). La pantalla nueva tiene que verse como parte de la misma app.
- Si falta un dato (qué muestra, de qué endpoint sale, qué pasa al hacer clic), preguntá en una sola tanda.
- ¿La API ya tiene el endpoint? Mirá `apps/api/src/*/` (ver tabla en `docs/RESUMEN.md`). Si no existe, proponelo y explicá la decisión de backend.

## 2. Archivos
```
apps/web/src/app/paginas/<nombre>/
  <nombre>.ts      // componente standalone, signals
  <nombre>.html
  <nombre>.scss
  <nombre>.spec.ts // lógica no trivial (filtros, cálculos de vista)
  <subcomponente>/ // tablas, paneles de detalle: carpeta propia dentro de la página
```
- Nombres en español, clase sin sufijo (`export class Posiciones`), selector `app-<nombre>`.
- Lógica pura de vista en un archivo aparte testeable (ej. `movimiento-vista.ts`).
- Comentario corto arriba de la clase diciendo qué hace la pantalla; comentá lo no obvio pensando en que Tomás aprende Angular.

## 3. Ruta y navegación
- `apps/web/src/app/app.routes.ts`: `{ path: '<nombre>', component: X, title: '<Título> · Nonio' }`.
- Query params (`?activo=BTC`) llegan como `input()` (withComponentInputBinding).
- Si va en el riel: `layout/riel-navegacion/riel-navegacion.ts`, completar `ruta` del ítem (icono de `@lucide/angular`).

## 4. Datos
- Servicio en `servicios/<x>.service.ts` con `recursoCompartido<T>('/api/...')` (se recarga solo con Sincronizar).
- Tipos en `servicios/modelos.ts`. Montos como **string decimal**, nunca `number`; mostrar con los pipes de `compartido/formato` (decimal, signo, fecha).
- En la página: `recurso = inject(XService).x()` y un `computed` que devuelva `[]`/null si hay error o no hay valor.

## 5. Plantilla (estructura fija)
```html
<app-encabezado-pagina titulo="..." [descripcion]="descripcion()" [cargando]="!recurso.hasValue() && !recurso.error()">
  <!-- acciones; las que todavía no andan: class="boton boton--pronto" aria-disabled="true" title="Próximamente" -->
  <app-boton-sincronizar />
</app-encabezado-pagina>

@if (recurso.error()) {
  <p class="estado">No pudimos cargar ... Revisá que la API y la base estén levantadas.</p>
} @else if (!recurso.hasValue()) {
  <div role="status"><span class="solo-lectores">Cargando…</span> <!-- app-esqueleto con la forma real --></div>
} @else if (vacio()) {
  <!-- estado vacío que invita a la acción -->
} @else {
  <!-- contenido en <app-card titulo subtitulo> -->
}
```
Siempre los 4 estados: error, cargando (esqueleto con la forma final, nada salta), vacío y con datos.

## 6. Compartidos (reusar, no duplicar)
`compartido/`: `card`, `encabezado-pagina`, `esqueleto`, `avisos`, `boton-sincronizar`, `formato` (pipes), `animacion` (cifra-animada, pop, primera-vez).
Estilos globales: `.boton`, `.boton--primario|secundario|pronto`, `.selector`, `.positivo/.negativo/.cero`, `.solo-lectores`.

## 7. Estilos
- Solo tokens de `src/styles/_tokens.scss`: colores `--color-*`, tipografía `--texto-xs…3xl` (no otros tamaños), espaciado `--espacio-1…8`, `--gap`, `--pad`, `--radius-card`, movimiento `--dur-rapida|media` + `--curva`.
- Nada de hex ni px sueltos. Si hace falta un valor que no está, preguntá si se agrega como token.
- Positivo/negativo con `--color-positive/negative` y además signo (no solo color).

## 8. Datos de prueba y repo público
- Datos inventados en `servicios/datos-prueba/` o `apps/api/prisma/datos-prueba/`, marcados como de prueba.
- Nunca montos reales, capturas reales, claves ni `.env`.

## 9. Cerrar
- `pnpm --filter web test` y verificar en el preview (estado de carga, error, vacío, datos; ancho chico).
- Actualizar `docs/RESUMEN.md` (sección Web) si es pantalla nueva.
