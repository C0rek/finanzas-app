# Auditoría de UI, UX y código — Nonio

**Fecha:** 2026-11-09 · **Rama auditada:** `claude/ecstatic-brahmagupta-ggzei8` (commit `00d85e9`)
**Alcance:** web (Angular) + api (NestJS/Prisma). Solo desktop (1440×900). Mobile y modo oscuro fuera de alcance.
**Método:** skills `refactoring-ui` (UI), `ux-heuristics` (UX + WCAG 2.1 AA), `architecture-optimization` (código, 8 fases en modo solo diagnóstico).
**Sin cambios de código.** Las mediciones se tomaron contra la base local; este documento no incluye montos ni datos reales.

## Notas

| Área | Nota | En una línea |
|---|---|---|
| UI (visual) | **7/10** | Sistema de tokens sólido y limpio; fallan la jerarquía del dashboard, la escala de espaciado/tipografía y la notación de moneda. |
| UX (usabilidad) | **6/10** | Buen feedback de carga y sincronización; hay controles que parecen andar y no hacen nada, y un título con un período equivocado. |
| Accesibilidad (WCAG AA) | **7/10** | Contraste AA en todo el texto, foco visible y reduced-motion; fallan etiquetas, ARIA de tablas/pestañas e info solo en hover. |
| Código | **7/10** | Dominio bien testeado (216 tests verdes) y decimales exactos; reglas de negocio duplicadas entre front y back, recálculo total por endpoint y sin CI/lint. |

Severidad: **S4** catastrófico · **S3** mayor · **S2** menor · **S1** cosmético. Prioridad: **P1** ya · **P2** pronto · **P3** cuando se pueda.

---

## 1. UI — 7/10 (refactoring-ui)

Diagnóstico rápido (8 chequeos): pasa 6 de 8 → base 8; baja a 7 por la notación de moneda inconsistente y los títulos duplicados.

| Chequeo | Resultado |
|---|---|
| Jerarquía con blur | ❌ La card de Exposición BTC domina la fila 1; el Patrimonio total queda secundario. |
| Funciona en grises | ✅ Los resultados llevan signo además de color. |
| Espacio en blanco | ✅ Generoso (a veces de más en Exposición BTC). |
| Etiquetas apagadas vs. valores | ✅ |
| Escala de espaciado | ❌ Valores sueltos: 2, 3, 6, 10, 14, 20 px; tipos de 11 y 13 px fuera de escala. |
| Ancho de texto acotado | ✅ |
| Contraste | ✅ |
| Sombras/elevación | ✅ Diseño plano coherente. |

### Checklist UI

- [x] ~~**P1 · S3** Jerarquía del dashboard: el KPI principal (Patrimonio total) debería ser lo primero que se lee. Hoy la cifra más grande de la pantalla es el % de exposición a BTC. Revisar el orden de la fila 1 o el tamaño de las cifras (`dashboard.scss`, `exposicion-btc.scss`).~~ **Descartado:** Tomás quiere que la exposición a BTC sea lo primero que se lee.
- [x] **P1 · S2** Unificar la notación de moneda: hoy conviven `US$ 1.234`, `$ 1.234`, `−US$ 271` y `−$ 97,79`, y también columnas sin símbolo (PPC, Monto actual). **Hecho:** todo monto en dólares lleva `$ ` (también dentro de las tablas); los pesos siguen como `ARS `. Encabezados y textos dicen "dólares" en vez de `US$`.
- [x] **P2 · S2** Encabezados de la tabla de Posiciones que se parten en dos líneas ("Precio de mercado", "No realizada US$"). Acortar ("Precio", "Resultado", "%") o agrupar "No realizada" en un solo encabezado con dos subcolumnas. **Hecho:** "Precio", "No realizada" y "%", con `nowrap`; el detalle va en el `title`.
- [x] **P2 · S2** Escala de espaciado: llevar 2/3/6/10/14/20 px a la escala 4/8/12/16/24/32 y agregar tokens (`--espacio-1`…). Hoy solo hay `--gap` y `--pad`. **Hecho:** tokens `--espacio-1…8` (4/8/12/16/24/32); `--gap` y `--pad` apuntan a ellos; 118 valores migrados (33 estaban fuera de escala).
- [x] **P2 · S2** Escala tipográfica: 11 y 13 px están fuera de escala; 12 px se usa 32 veces (mucho texto chico). Definir tokens de tipo (12/14/16/20/24/30/44). **Hecho:** tokens `--texto-xs…3xl` (12/14/16/20/24/30/44); 11→12, 13→14 y 18→16.
- [x] **P2 · S1** Colores sueltos fuera de tokens: `#d9dce1`, `#2e2e2e` (hover de botones), `#cfd4dc` (tabla movimientos), `#fff` en 4 lugares. Pasarlos a tokens (también deja listo el modo oscuro). **Hecho:** `--color-primary-hover`, `--color-secondary-hover`, `--color-border-strong` y `--color-on-primary`.
- [x] **P2 · S2** Títulos duplicados: en Posiciones, página "Posiciones" + card "Posiciones". Sacar el título de la card cuando está sola en la página. **Hecho:** el título de la card es opcional; la tabla lo muestra solo en el dashboard.
- [x] **P2 · S2** Leyendas repetidas: "Incluye solo activos spot. Es un total parcial." aparece 3 veces en el dashboard. Decirlo una vez (por ejemplo, junto al título de la página) o como badge "Parcial". **Hecho:** se dice una vez en la descripción de la página (Resumen y Posiciones); las cards solo dicen la hora de cálculo.
- [x] **P3 · S2** Avisos de precios ("Valor manual: …", "Precio desactualizado: …") en texto gris corrido: ruido visual. Pasarlos a un ícono de aviso con detalle al abrir, o a un chip por activo en la tabla. **Hecho:** componente compartido `app-avisos`: una línea "N avisos sobre estos datos" con ícono que se despliega (`<details>`, accesible con teclado). Lo usan Patrimonio, Exposición BTC y Posiciones.
- [x] **P3 · S1** Card de Exposición BTC: mucho alto vacío entre la cifra y la barra; se puede compactar y darle ese espacio al patrimonio. **Hecho:** el contenido va junto arriba (sin `space-between`) y la hora de cálculo y los avisos quedan al pie. La fila 1 no cambió: la exposición sigue primero (decisión de Tomás).
- [x] **P3 · S1** Gráfico de evolución: el eje dice 0–8 sin unidad visible en el eje (está en el subtítulo). Poner "k" o "US$ mil" en las marcas. **Hecho:** las marcas dicen "8k", "6k"… (el 0 solo).
- [x] **P3 · S1** Botones "Próximamente" con chip dentro del botón: tres botones en el encabezado y dos apagados le restan peso al único que funciona (Sincronizar). **Hecho:** Sincronizar es el primario y va a la derecha; Importar CSV y Nuevo/Cargar movimiento son botones fantasma sin chip, con `aria-disabled` + tooltip y "(próximamente)" para lectores.

---

## 2. UX — 6/10 (ux-heuristics)

Banda 6-8: varios problemas mayores (S3), ninguno catastrófico. Lo mejor: estados de carga con esqueletos, error por card sin romper la página, sincronización con feedback y anuncio a lectores, Esc para cerrar paneles, filtros que vuelven a la página 1.

### Checklist UX

- [x] **P1 · S3** *Nielsen 1/2 — Título con período equivocado.* "Resumen · octubre 2026" sale de un dato de prueba fijo (`servicios/datos-prueba/resumen-dashboard.ts`) mientras los datos son de noviembre. Calcular el período desde la fecha actual o sacarlo. **Hecho:** el período sale de la fecha de hoy.
- [x] **P1 · S3** *Nielsen 1/5 — Controles falsos en el detalle de movimiento.* La nota es un `<textarea>` editable que no guarda nada: lo que escribís se pierde al cambiar de fila. "Agregar" etiqueta, la X de quitar etiqueta y "Ver ETH en Posiciones" no hacen nada. Opciones: deshabilitarlos con "Próximamente" (como los botones del encabezado) o conectar "Ver en Posiciones" (ya existe la ruta `?activo=`). **Hecho:** etiquetas y nota apagadas con "Próximamente"; "Ver en Posiciones" navega a `/posiciones?activo=`.
- [x] **P1 · S3** *Nielsen 4 — Modo oscuro y notificaciones.* Los botones de luna y campana se ven activos y no hacen nada. Marcarlos como "Próximamente" igual que el resto (tooltip + estado apagado). **Hecho:** apagados con tooltip y `aria-disabled`.
- [x] **P1 · S3** *Krug "no me hagas pensar" — Un SALDO se muestra con "+".* Un saldo fija la cantidad, no suma; el "+0,1599 ETH" sugiere una compra. Mostrar "= 0,1599 ETH" o "Saldo: 0,1599 ETH" sin signo (igual que las transferencias). **Hecho:** el saldo se muestra "= 0,1599 ETH", sin signo.
- [ ] **P2 · S3** *Nielsen 2 — Salto engañoso en Evolución.* Los meses cerrados se valúan a costo o a cierre y el mes actual a mercado: la barra actual puede saltar sin que haya pasado nada real. Marcar visualmente las barras "a costo" (rayado o color distinto) y no solo en la leyenda.
- [ ] **P2 · S2** *Nielsen 4 — Vocabulario.* "Patrimonio total", "Cartera de inversión", "Total cartera", "Resto de la cartera" y "No incluye la liquidez" se cruzan y no queda claro qué incluye cada uno. Armar un glosario de 4-5 términos y usar uno por concepto.
- [ ] **P2 · S2** *Nielsen 6 — Info solo en hover.* "PPC", "Precio de mercado", "No realizada" se explican solo con `title`. Con teclado no se ven. Usar el término completo ("Precio promedio") o un tooltip accesible.
- [ ] **P2 · S2** *Nielsen 3 — Filtros que se pierden.* Los filtros de Movimientos (pestaña, mes, búsqueda, página) no viven en la URL: al ir a Posiciones y volver con Atrás se reinician. Guardarlos como query params.
- [ ] **P2 · S2** *Nielsen 9 — Mensajes de error técnicos y sin salida.* "Revisá que la API y la base estén levantadas" no ofrece reintentar. Agregar un botón "Reintentar" en el estado de error de cada card.
- [ ] **P2 · S2** *Nielsen 8 — Panel de movimiento abierto por defecto.* Movimientos abre siempre el detalle del más reciente y le quita ancho a la tabla. Evaluar arrancarlo cerrado y abrirlo al elegir una fila (como Posiciones).
- [ ] **P3 · S2** *Nielsen 7 — Paginación de 10 filas fija.* Con decenas de movimientos por mes, 10 por página obliga a paginar mucho. Ofrecer 25/50 o scroll.
- [ ] **P3 · S2** *Nielsen 8 — Pestaña "Futuros 0" y bloque "Futuros — Pendiente".* Funcionalidad vacía que ocupa lugar. Esconder hasta que haya datos.
- [ ] **P3 · S1** *Nielsen 8 — Columna Etiqueta casi siempre "—".* Ocupa ancho sin aportar. Esconderla si ninguna fila de la página tiene etiquetas.
- [ ] **P3 · S1** *Krug, Trunk test — Riel solo con íconos.* El nombre aparece tras 300 ms de hover. Con 3 secciones activas se podrían mostrar etiquetas o un riel expandible.

---

## 3. Accesibilidad WCAG 2.1 AA — 7/10

Medido en el navegador: **todo el texto visible pasa contraste AA** (4,5:1 normal, 3:1 grande). `lang="es"`, títulos de página por ruta, foco visible en botones/filas, `prefers-reduced-motion` respetado, esqueletos con texto para lectores, anuncio "Datos actualizados" en `aria-live`.

- [x] **P1 · S3** *1.3.1 / 4.1.2 / 3.3.2* El buscador de Movimientos no tiene nombre accesible (solo placeholder). Agregar `aria-label="Buscar movimientos"`. **Hecho:** `aria-label="Buscar movimientos"`.
- [x] **P1 · S2** *1.1.1* El origen del movimiento (importado / API / manual) se comunica solo con un ícono; el `title` en el `<svg>` no lo leen los lectores. Agregar texto oculto (`.solo-lectores`) o `aria-label` en un contenedor con rol. **Hecho:** ícono decorativo + texto `.solo-lectores`.
- [ ] **P2 · S2** *4.1.2* Pestañas: `role="tab"` sin `tabpanel`, sin `aria-controls` y sin navegación con flechas. Completar el patrón ARIA o usar botones simples con `aria-pressed`.
- [ ] **P2 · S2** *4.1.2* Filas de tabla con `aria-selected` / `aria-expanded` en `<tr>` sin rol `grid`/`row`: ARIA inválido. Usar un botón dentro de la primera celda o `role="grid"` completo.
- [ ] **P2 · S2** *2.4.3* El detalle de Posiciones mueve el foco al abrir; el de Movimientos no. Unificar (y devolver el foco a la fila al cerrar).
- [ ] **P2 · S2** *1.4.13* Tooltips de encabezados con `title`: no aparecen con teclado. Ver ítem de UX.
- [ ] **P3 · S1** *4.1.2* Ítems deshabilitados del riel: `aria-label` sobre un `<span>` sin rol (prohibido en genéricos). Usar `role="link" aria-disabled="true"` o texto oculto.
- [ ] **P3 · S1** *2.4.1* Sin enlace "Saltar al contenido".

---

## 4. Código — 7/10 (architecture-optimization, solo diagnóstico)

**Lo bueno:** decimales exactos de punta a punta (texto + decimal.js, sin floats), lógica de dominio en funciones puras con 146 tests en la api y 70 en la web (todos verdes), proveedores de precios detrás de una interfaz con timeout de 5 s y respaldo al último precio guardado, API solo en 127.0.0.1 y errores sin filtrar datos internos, comentarios didácticos.

### Mediciones (fase 1, línea base)

| Medición | Valor |
|---|---|
| Endpoints de patrimonio, caché de precios caliente | 70-110 ms c/u |
| Endpoints de patrimonio, en frío (arranque de la app, 4 en paralelo) | 850-1.250 ms c/u; arranque completo ~1,3 s (los 4 consultan proveedores a la vez) |
| `GET /movimientos` | ~90-190 ms · 1.731 filas · **~820 KB sin comprimir** |
| Bundle inicial web (producción) | 475 KB crudo / 111 KB transferido; sin rutas lazy |
| Tests | api 146 ✅ (8 s) · web 70 ✅ (16 s) |

No hay dolor de rendimiento reportado, así que nada de esto es urgente: son las líneas base para medir el antes/después.

### Checklist código

**Límites y dependencias (fase 2)**
- [x] **P1 · S3** Reglas de negocio duplicadas en el front: "la liquidez es solo USDT" y la categoría de cada movimiento (`movimiento-vista.ts`), los decimales por activo (`DECIMALES_POR_ACTIVO`) y el % de resultado total (calculado en `resultado.ts` y en `tabla-posiciones.ts`). El back ya tiene el grupo LIQUIDEZ en el catálogo: que la API devuelva categoría, decimales y % y el front solo los muestre. **Hecho:** la API manda `categoria` y `decimales` por movimiento y `noRealizadaPct` en el total de posiciones; el front solo muestra. Los decimales por activo siguen en una constante de la API (no hay columna en la base).
- [ ] **P2 · S2** Contrato de la API escrito dos veces a mano (`apps/web/.../modelos.ts` y los tipos de `apps/api`). Ya se desfasaron: el front espera `p2p`, `mercado`, `origen` que la API devuelve fijos. Crear `packages/shared` (previsto en el roadmap) con los tipos de respuesta.
- [ ] **P2 · S2** `movimientos` depende de `patrimonio` (`nombreLegible` vive en `exposicion-btc.ts` y lo usan 3 módulos). Moverlo a un módulo `cuentas` o `comun`.
- [ ] **P3 · S2** Escritura dentro de un GET: `PreciosService.vigentes` hace `upsert` de precios (secuencial, uno por activo) en cada consulta. Separarlo (guardar en un paso aparte o en lote con `Promise.all`/transacción).

**Módulos profundos y duplicación (fase 3)**
- [x] **P1 · S2** `TablaPosiciones` vive en `paginas/dashboard/secciones/` pero la usa la página de Posiciones. Moverla a `paginas/posiciones/` o `compartido/`. **Hecho:** ahora está en `compartido/tabla-posiciones/`.
- [x] **P1 · S2** `DashboardService` y `datos-prueba/resumen-dashboard.ts` solo existen para el período falso. Borrarlos al calcular el período. `datos-prueba/movimientos.ts` solo lo usa un spec: moverlo a fixtures de test. **Hecho:** borrados; los datos de prueba de movimientos pasaron a `movimientos.fixture.ts`.
- [ ] **P2 · S2** Lógica de cierre animado copiada igual en `DetalleMovimiento` y `DetallePosicion` (saliendo, cerrado, setTimeout 400, Esc). Extraer un componente o directiva `panel-lateral`.
- [ ] **P2 · S2** Armado de avisos repetido en 3 componentes (`patrimonio.ts`, `exposicion-btc.ts`, `tabla-posiciones.ts`). Una función compartida `textosDeAvisos(avisos)`.
- [ ] **P2 · S1** El patrón `!recurso.error() && recurso.hasValue() ? recurso.value() : undefined` se repite en 6+ lugares. Helper `valorDe(recurso)`.
- [ ] **P2 · S1** `"SPY-TOK" → "SPY"` resuelto en dos lugares (`tabla-posiciones.ts`, `detalle-posicion.ts`). Que lo mande la API como `nombre`.
- [ ] **P3 · S2** `PatrimonioService.calcular()` devuelve 9 cosas y cada endpoint lo corre entero. Ver fase 5.

**Refactors puntuales (fase 4)**
- [ ] **P2 · S2** Comparaciones de decimales como texto: `carteraUsd === '0.00'`, `costoUsd === '0.00'`, `porcentaje !== '0.00'`. Se rompen si la API cambia el formato ("0" o "0.0"). Usar `new Decimal(x).isZero()`.
- [ ] **P3 · S1** Número mágico acoplado al CSS: el indicador del riel se mueve `índice × 44 px` (40 de alto + 4 de gap definidos en el SCSS). Medir el elemento como ya se hace en las pestañas de Movimientos.
- [ ] **P3 · S1** Anchos de columna con `style` en línea en los `<colgroup>`. Pasarlos al SCSS.
- [ ] **P3 · S1** `import` después de una constante en `patrimonio.service.ts` (línea 22). Ordenar imports.

**Rendimiento (fases 5-6)**
- [ ] **P2 · S2** Arranque en frío: los 4 endpoints de patrimonio recalculan todo y consultan proveedores a la vez (~900 ms c/u, 4 descargas de la lista completa de Binance). Agrupar los pedidos simultáneos (single-flight de `calcular()` o de la consulta de precios) o un endpoint `/resumen`. Medir el antes/después contra la línea base.
- [ ] **P2 · S2** `GET /movimientos` manda ~820 KB sin compresión. Activar `compression` en Nest (cambio de una línea) y medir. Paginación del lado del servidor solo si el volumen crece.
- [ ] **P3 · S2** `evolucion()` pide los cierres mensuales de cada cripto uno detrás de otro (`await` dentro del `for`). Pasar a `Promise.all`.
- [ ] **P3 · S1** Rutas sin lazy loading (`loadComponent`). Bajo impacto hoy; anotarlo para cuando haya más pantallas.

**Confiabilidad (fase 7)**
- [ ] ✅ Timeouts en proveedores, respaldo a precio guardado, caché de fallas. Nada urgente.
- [ ] **P3 · S1** Sin endpoint de salud (`/salud`) para que la web distinga "API caída" de "base caída" y lo diga en el error.

**Hábitos (fase 8)**
- [ ] **P2 · S2** Sin CI ni lint: no hay `.github/workflows` ni ESLint. Un workflow que corra los tests de api y web en cada push.
- [ ] **P3 · S1** Formato distinto entre apps (api con comillas dobles, web con simples; Prettier solo en web). Un Prettier en la raíz.

---

## Orden sugerido

1. **Rápidos y de alto impacto (P1):** período del título, controles falsos del detalle, botones luna/campana, signo del SALDO, `aria-label` del buscador, mover `TablaPosiciones`, borrar `DashboardService`.
2. **Coherencia (P2 UI/UX):** notación de moneda, vocabulario, escala de espaciado y tipos en tokens.
3. **Código (P2):** reglas de negocio al back, `packages/shared`, panel lateral compartido, CI.
4. **Rendimiento (P2-P3):** compresión y single-flight, midiendo contra la línea base de arriba.
