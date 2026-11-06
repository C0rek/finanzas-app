# Patrimonio total, primera versión (solo spot): plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la tarjeta "Patrimonio total" muestre, leyendo de Postgres, la suma en USD de los activos spot valorizados al momento de la consulta, aclarando que el total es parcial.

**Architecture:** Un comando manual vuelca una vez el historial y el catálogo a Postgres. Un servidor NestJS lee movimientos de la base, calcula posiciones con un motor puro, las valoriza con precios en vivo o guardados, y expone `GET /patrimonio`. Angular consume ese endpoint solo en esa tarjeta.

**Tech Stack:** NestJS 12, Prisma 7 con `@prisma/adapter-pg`, Postgres 16, decimal.js, Vitest 5, tsx, Angular 22 con `httpResource`.

**Spec:** `docs/superpowers/specs/2026-11-06-patrimonio-spot-design.md`

## Global Constraints

- Repo público: ninguna cantidad, saldo, clave, `.env` ni catálogo real entra al repo. Fixtures y tests usan datos inventados, marcados como tales.
- Montos y cantidades siempre en decimal exacto: en la API viajan como `string`, se calculan con `decimal.js`. `number` solo se admite en el borde del proveedor (Task 4).
- El servidor y el front nunca leen archivos ni la Sheet. Solo `pnpm db:volcar` lee `DATA_DIR`.
- El servidor escucha solo en `127.0.0.1`.
- `parcial` es siempre `true` en esta versión.
- `cantidad` de `spot.csv` ya viene neta de comisiones: no se resta de nuevo.
- Caché de precios: 60 segundos. Timeout por proveedor: 5 segundos.
- Comentarios y mensajes en español rioplatense. Explicar en comentarios las decisiones de backend que no sean obvias, porque Tomás está aprendiendo.
- Imports ESM con extensión `.js` (`NodeNext`), como el código existente.
- `tsx` no emite metadata de decoradores: toda inyección de NestJS usa `@Inject(Token)` explícito.

## Review Focus

1. Tests corriendo contra la base real: el setup se niega si el nombre de la base no termina en `_test` (Task 1).
2. Volcar sobre una base con datos del seed: el comando se niega, para no mezclar reales con inventados (Task 3).
3. Un proveedor que devuelve precio `0` o inválido, como Finnhub con un símbolo desconocido: se trata como falla, nunca valoriza en 0 (Task 4).
4. Un activo deslistado en Binance: no rompe los demás precios, por eso no se usa el parámetro `symbols` (Task 4).
5. Base vacía o back caído: la tarjeta lo explica y nunca muestra `US$ 0` como si fuera tu patrimonio ni el dato de prueba (Task 6).

---

### Task 1: Base de datos, migración y entorno de tests

**Files:**
- Modify: `apps/api/prisma/schema.prisma`, `apps/api/package.json`, `apps/api/.env.example`, `package.json`
- Create: migración generada en `apps/api/prisma/migrations/`, `apps/api/vitest.config.ts`, `apps/api/test/preparar-base.ts`, `apps/api/test/preparar-base.spec.ts`

**Interfaces:**
- Produces: modelo `Precio`; `Movimiento.idExterno`; `Activo.{ratio, fuentePrecio, simboloPrecio}`; enums `TipoMovimiento.AJUSTE`, `FuentePrecio { CRIPTO BOLSA MANUAL }`, `OrigenPrecio { API MANUAL }`, `TipoActivo.{FONDO, BONO, ACCION}`; `asegurarBaseDeTest(url: string): void`.

- [ ] **Step 1:** Pedir a Tomás que abra Docker Desktop y correr `docker compose up -d`. Esperado: puerto 5432 abierto. Revisar si el volumen ya tenía datos: `pnpm --filter api exec prisma migrate status`.
- [ ] **Step 2:** Agregar dependencias a `apps/api`: `decimal.js`; dev: `vitest`, `pg`, `@types/pg`.
- [ ] **Step 3:** Escribir `preparar-base.spec.ts`:

```ts
expect(() => asegurarBaseDeTest('postgresql://u:p@localhost:5432/finanzas')).toThrow(/_test/);
expect(() => asegurarBaseDeTest('postgresql://u:p@localhost:5432/finanzas_test')).not.toThrow();
```

- [ ] **Step 4:** Correr `pnpm --filter api test preparar-base`. Esperado: FAIL, la función no existe.
- [ ] **Step 5:** Implementar `asegurarBaseDeTest` y el `globalSetup` de Vitest: toma `TEST_DATABASE_URL` (default `postgresql://finanzas:finanzas_dev@localhost:5432/finanzas_test`), valida, crea la base si no existe y corre `prisma migrate deploy` contra ella. `vitest.config.ts` fija `test.env.DATABASE_URL` a esa URL y `fileParallelism: false`.
- [ ] **Step 6:** Editar el schema. `Precio`: `activoId Int @unique`, `precioUsd Decimal @db.Decimal(36,18)`, `obtenidoEn DateTime @db.Timestamptz(3)`, `origen OrigenPrecio`, `@@map("precios")`. `Movimiento.idExterno String? @unique`. `Activo.ratio Decimal? @db.Decimal(36,18)`, `Activo.fuentePrecio FuentePrecio?` (`null` = sin fuente, se informa como sin valorizar), `Activo.simboloPrecio String?`.
- [ ] **Step 7:** Generar y aplicar la migración: `pnpm db:migrate --name patrimonio_spot`. Esperado: los `CHECK` existentes quedan intactos en la base.
- [ ] **Step 8:** Agregar a `.env.example`, comentados, `DATA_DIR` y `FINNHUB_API_KEY`. Agregar scripts: `test`, `db:volcar`, `start` (Task 5) en `apps/api` y `db:volcar`, `dev:api` en la raíz.
- [ ] **Step 9:** Correr `pnpm --filter api test`. Esperado: PASS.
- [ ] **Step 10:** Commit: `API: migración de patrimonio spot y entorno de tests`.

### Task 2: Motor de posiciones

**Files:**
- Create: `apps/api/src/patrimonio/motor-posiciones.ts`, `apps/api/src/patrimonio/motor-posiciones.spec.ts`

**Interfaces:**
- Produces:

```ts
export type MovimientoPosicion = { simbolo: string; tipo: string; cantidad: string };
export type Posicion = { simbolo: string; cantidad: Decimal };
export type ResultadoPosiciones = { posiciones: Posicion[]; saldosNegativos: string[] };
export function calcularPosiciones(movimientos: MovimientoPosicion[]): ResultadoPosiciones;
```

- [ ] **Step 1:** Escribir los tests:
  - `COMPRA 1.5` + `VENTA 0.5` da `1`.
  - `AJUSTE 12` suma.
  - `COMPRA 0.1` + `COMPRA 0.2` da exactamente `0.3`.
  - Saldo exactamente 0: no aparece en `posiciones` ni en `saldosNegativos`.
  - `VENTA 3` sin compra: no aparece en `posiciones`, `saldosNegativos` es `['X']`.
  - `TRANSFER`, `APORTE`, `REWARD`, `COMISION` y `PNL_FUTUROS` se ignoran.
- [ ] **Step 2:** Correr y confirmar FAIL.
- [ ] **Step 3:** Implementar `calcularPosiciones` como función pura, ordenando por símbolo para que la salida sea estable.
- [ ] **Step 4:** Correr y confirmar PASS.
- [ ] **Step 5:** Commit: `API: motor de posiciones spot`.

### Task 3: Volcado único

**Files:**
- Create: `apps/api/src/volcado/leer-catalogo.ts`, `apps/api/src/volcado/volcar.ts`, `apps/api/prisma/volcar.ts`, `apps/api/test/fixtures/README.md`, `apps/api/test/fixtures/historial/spot.csv`, `apps/api/test/fixtures/catalogo-activos.csv`, `apps/api/src/volcado/volcar.spec.ts`

**Interfaces:**
- Consumes: modelos de la Task 1, `crearPrisma()`.
- Produces: `volcar(prisma: PrismaClient, dataDir: string): Promise<{ movimientos: number; activos: number }>`. Lanza `Error` con todos los problemas juntos.

Rutas dentro de `dataDir`: `historial/spot.csv` y `catalogo-activos.csv`.

Columnas del catálogo: `simbolo,nombre,tipo,ratio,fuente_precio,simbolo_precio,unifica_en,valor_manual_usd,valor_manual_fecha`.

Reglas de conversión de cada fila de `spot.csv`:
- Fecha `YYYY-MM-DD` se toma como `T00:00:00Z`. También se acepta `YYYY-MM-DDTHH:MM:SSZ`.
- `moneda_pago` `ARS` se guarda como `ARS`. `USD` y `USDT` se guardan como `USD`.
- `AJUSTE` guarda `precio` `null`. `COMPRA` y `VENTA` usan `precio_efectivo`.
- `comision` vacía o 0 guarda comisión y activo de comisión en `null`.
- `exchange` se traduce con una constante: `IOL` es `BROKER`; `BINANCE`, `BINGX`, `BITUNIX`, `BLOFIN`, `NEXO` y `LEMON` son `EXCHANGE`. Otro valor es error.

- [ ] **Step 1:** Crear los fixtures con activos inventados (`CRIPTOX`, `CEDEARX`, `FONDOX`, `BONOX`, `BONOXD`), y un `README.md` en la carpeta que aclare que son datos inventados.
- [ ] **Step 2:** Escribir los tests contra la base de test, limpiándola en `beforeEach`:
  - Volcar crea los movimientos y activos esperados, con `ratio`, `fuentePrecio` y `simboloPrecio`.
  - `valor_manual_usd` crea un `Precio` con `origen = MANUAL` y `obtenidoEn = valor_manual_fecha`.
  - `BONOXD` se guarda como `BONOX`, y su compra y venta se cancelan en `calcularPosiciones`.
  - Volcar dos veces deja la misma cantidad de filas.
  - Si cambia una fila del CSV, el movimiento se actualiza.
  - Símbolo fuera de catálogo: lanza y no queda ningún movimiento.
  - Dos filas inválidas: el error nombra ambas.
  - Catálogo: `CEDEAR` sin ratio, `MANUAL` sin valor, ratio 0 y `CRIPTO` sin `simbolo_precio` lanzan.
  - Base con un movimiento sin `idExterno`: lanza con un mensaje que menciona datos de prueba y `pnpm db:reset`.
- [ ] **Step 3:** Correr y confirmar FAIL.
- [ ] **Step 4:** Implementar `volcar` con `csv-parse`, validando todo antes de escribir y usando `upsert` por `idExterno` en una transacción con `timeout: 60000`. `prisma/volcar.ts` lee `DATA_DIR`, falla con un mensaje claro si falta e imprime los conteos, sin montos.
- [ ] **Step 5:** Correr y confirmar PASS.
- [ ] **Step 6:** Commit: `API: volcado del historial spot a la base`.

### Task 4: Precios y valuación

**Files:**
- Create: `apps/api/src/precios/proveedor-precios.ts`, `apps/api/src/precios/binance.ts`, `apps/api/src/precios/finnhub.ts`, `apps/api/src/precios/precios.service.ts`, `apps/api/src/patrimonio/valuador.ts`, y sus `.spec.ts`

**Interfaces:**
- Consumes: `Posicion` de la Task 2, modelo `Precio`.
- Produces:

```ts
export type PrecioObtenido = { precioUsd: string; del: Date };
export interface ProveedorPrecios {
  // Símbolo sin precio válido = ausente en el Map. Caída total = lanza.
  obtener(simbolos: string[]): Promise<Map<string, PrecioObtenido>>;
}
export type ActivoValuable = { id: number; simbolo: string; ratio: string | null; fuentePrecio: 'CRIPTO' | 'BOLSA' | 'MANUAL' | null; simboloPrecio: string | null };
export type PrecioVigente = { precioUsd: string; del: Date; origen: 'API' | 'MANUAL'; desactualizado: boolean };
export class PreciosService {
  constructor(prisma: PrismaClient, proveedores: { CRIPTO: ProveedorPrecios; BOLSA: ProveedorPrecios }, ahora?: () => Date);
  vigentes(activos: ActivoValuable[]): Promise<Map<string, PrecioVigente>>; // clave: simbolo
}
export type RespuestaPatrimonio = {
  totalUsd: string; calculadoEn: string; parcial: true;
  activos: { simbolo: string; cantidad: string; precioUsd: string; valorUsd: string; origenPrecio: 'API' | 'MANUAL'; precioDel: string }[];
  avisos: { desactualizados: { simbolo: string; precioDel: string }[]; sinValorizar: string[]; saldosNegativos: string[] };
};
export function valuar(posiciones: Posicion[], saldosNegativos: string[], activos: ActivoValuable[], precios: Map<string, PrecioVigente>, ahora: Date): RespuestaPatrimonio;
```

Proveedores comprobados el 06/11/2026:
- **Cripto: Binance**, `GET https://api.binance.com/api/v3/ticker/price`, sin clave. Devuelve precios como texto. Se pide la lista completa y se filtra, porque el parámetro `symbols` hace fallar toda la consulta si un símbolo no existe. `simbolo_precio` lleva el par, por ejemplo `BTCUSDT`. Cotiza en USDT y se toma como equivalente a USD.
- **Bolsa: Finnhub**, `GET https://finnhub.io/api/v1/quote?symbol=X` con `FINNHUB_API_KEY`. Campos `c` (precio) y `t` (hora, en segundos). Es la API oficial con plan gratuito; Yahoo también respondió sin clave, pero no es una API oficial. Devuelve `c` como número: se convierte con `String(c)` ahí mismo y no se usa como `number` en otro lado.

- [ ] **Step 1:** Escribir tests de proveedores, con `fetch` falso:
  - Binance devuelve solo los símbolos pedidos, y un símbolo inexistente queda ausente sin afectar a los demás.
  - Finnhub con `c: 0` o `c` ausente deja el símbolo ausente.
  - `del` de Finnhub sale de `t`.
  - HTTP 500 o timeout hacen que `obtener` lance.
  - Finnhub sin clave lanza con un mensaje que dice qué variable falta.
- [ ] **Step 2:** Escribir tests de `PreciosService`, contra la base de test con proveedores falsos:
  - Precio obtenido: se guarda en `precios` con `origen = API`, `desactualizado: false`.
  - Dos llamadas dentro de 60 s llaman al proveedor una vez; a los 61 s, dos veces.
  - Proveedor caído con precio guardado: lo usa con `desactualizado: true`.
  - Proveedor caído sin precio guardado: el activo queda ausente.
  - Falla `CRIPTO`: los activos de `BOLSA` siguen frescos.
  - Activo `MANUAL`: no llama a ningún proveedor, `origen = MANUAL`, `del` es la fecha del valor.
- [ ] **Step 3:** Escribir tests de `valuar`:
  - `40` CEDEARs con ratio `10` a `50` dan `valorUsd` `200.00`, y `cantidad` sigue siendo `40`.
  - `0.1` a `3` y `0.2` a `3` dan total `0.90`.
  - El total se suma sin redondear y se formatea al final con 2 decimales.
  - Posición sin precio o con `fuentePrecio` `null`: no suma, va a `sinValorizar`.
  - Precio desactualizado: suma y va a `desactualizados`.
  - `parcial` es `true`.
- [ ] **Step 4:** Correr y confirmar FAIL.
- [ ] **Step 5:** Implementar, usando `AbortSignal.timeout(5000)` en cada `fetch` y `upsert` por `activoId` en `precios`.
- [ ] **Step 6:** Correr y confirmar PASS.
- [ ] **Step 7:** Commit: `API: precios en vivo y valuación del patrimonio`.

### Task 5: Servidor NestJS y endpoint

**Files:**
- Create: `apps/api/src/main.ts`, `apps/api/src/app.module.ts`, `apps/api/src/patrimonio/patrimonio.controller.ts`, `apps/api/src/patrimonio/patrimonio.service.ts`, `apps/api/src/patrimonio/patrimonio.e2e.spec.ts`
- Modify: `apps/api/package.json`, `apps/api/tsconfig.json`, `.claude/launch.json`

**Interfaces:**
- Consumes: `calcularPosiciones`, `PreciosService`, `valuar`, `crearPrisma`.
- Produces: `GET /patrimonio` que devuelve `RespuestaPatrimonio`; tokens de inyección `PRISMA` y `PROVEEDORES` exportados desde `app.module.ts`, para poder reemplazarlos en tests.

- [ ] **Step 1:** Agregar `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `reflect-metadata`, `rxjs`; dev: `@nestjs/testing`. Activar `experimentalDecorators` en `tsconfig.json`.
- [ ] **Step 2:** Escribir el test de punta a punta. Levanta la app en un puerto libre, con el volcado de fixtures en la base de test y proveedores falsos:
  - `GET /patrimonio` devuelve 200 y un `totalUsd` igual a una cuenta hecha a mano sobre los fixtures, escrita como constante en el test.
  - `DATA_DIR` sin definir durante el request: sigue funcionando.
  - Base vacía: 200, `totalUsd: "0.00"`, `activos: []`.
  - Prisma que falla: 503 con `{ "mensaje": "No se pudo leer la base de datos" }`.
- [ ] **Step 3:** Correr y confirmar FAIL.
- [ ] **Step 4:** Implementar el módulo con `@Inject` explícito. `main.ts` escucha en `3000` y `127.0.0.1`, con `start` = `tsx watch src/main.ts`. Sumar la configuración `api` a `.claude/launch.json`.
- [ ] **Step 5:** Correr y confirmar PASS. Levantar con `pnpm dev:api` y comprobar con `curl -i http://127.0.0.1:3000/patrimonio`. Esperado: 200 con JSON.
- [ ] **Step 6:** Commit: `API: servidor NestJS con GET /patrimonio`.

### Task 6: Tarjeta en Angular

**Files:**
- Create: `apps/web/proxy.conf.json`, `apps/web/src/app/servicios/patrimonio.service.ts`, `apps/web/src/app/paginas/dashboard/secciones/patrimonio/patrimonio.spec.ts`
- Modify: `apps/web/angular.json` (`serve.options.proxyConfig`), `apps/web/src/app/app.config.ts`, `apps/web/src/app/servicios/modelos.ts`, los archivos `patrimonio.ts`, `patrimonio.html` y `patrimonio.scss` de la sección, `apps/web/src/app/paginas/dashboard/dashboard.html`

**Interfaces:**
- Consumes: `GET /api/patrimonio`, que el proxy reescribe a `http://127.0.0.1:3000/patrimonio`.
- Produces: `PatrimonioService.resumen`, un `httpResource<RespuestaPatrimonio>`; `<app-patrimonio />` sin inputs. `carteraInversionUsd` de los datos de prueba sigue alimentando a `app-exposicion-btc`.

- [ ] **Step 1:** Escribir tests con `provideHttpClientTesting`:
  - Respuesta OK: muestra el total con prefijo `US$`, la leyenda "Incluye solo activos spot", y "Cartera de inversión" con el mismo total.
  - No aparece "Bienes físicos y fiat".
  - Durante la carga muestra un estado de carga, sin montos.
  - HTTP 503: muestra un error, y no aparece ningún monto.
  - `activos: []`: muestra "Todavía no hay activos cargados" y no `US$ 0`.
  - Con avisos: nombra los activos desactualizados con su fecha, los sin valorizar y los saldos negativos.
- [ ] **Step 2:** Correr `pnpm --filter web test`. Esperado: FAIL.
- [ ] **Step 3:** Implementar. Agregar `provideHttpClient()` a `app.config.ts`, los tipos a `modelos.ts`, y reemplazar en `dashboard.html` por `<app-patrimonio />`. Sacar `patrimonio` del fijo solo en esta tarjeta.
- [ ] **Step 4:** Cambiar la nota de `dashboard.html` a: "Patrimonio total con datos de la base. El resto, datos de prueba inventados."
- [ ] **Step 5:** Correr y confirmar PASS.
- [ ] **Step 6:** Con la API levantada sobre la base de test, abrir el Dashboard en el navegador y comprobar la tarjeta con datos, con la API apagada y con la base vacía. No guardar capturas en el repo.
- [ ] **Step 7:** Commit: `Web: tarjeta de patrimonio conectada a la API`.

### Task 7: Puesta en marcha con datos reales

Todo lo real de esta tarea queda en `C:\dev\finanzas-datos` y en la base local. Nada entra al repo.

**Files:**
- Create (fuera del repo): `C:\dev\finanzas-datos\catalogo-activos.csv`
- Modify: `apps/api/.env` (ignorado por git), `docs/base-de-datos.md`, `docs/roadmap.md`

- [ ] **Step 1:** Armar el catálogo con todos los símbolos de `spot.csv` y de sus comisiones. Pedir a Tomás lo que falte: el valor de la cuotaparte del fondo. Confirmar en la API de Binance que cada par existe. Todo ratio se toma de lo que Tomás confirmó; no inventar.
- [ ] **Step 2:** Pedir a Tomás que cree `FINNHUB_API_KEY` y la cargue en `.env`. Nunca se pide la clave por chat. Comprobar que Finnhub devuelve precio para cada CEDEAR.
- [ ] **Step 3:** Si la base tiene datos del seed, avisar a Tomás y correr `pnpm db:reset` solo con su OK. Dejar la base sin movimientos.
- [ ] **Step 4:** Cargar `DATA_DIR=C:/dev/finanzas-datos` en `apps/api/.env` y correr `pnpm db:volcar`. Esperado: los conteos coinciden con las filas de `spot.csv`.
- [ ] **Step 5:** Comparar las posiciones de la base con el cálculo directo sobre el CSV. Esperado: iguales. Mostrarle el resultado a Tomás solo en el chat.
- [ ] **Step 6:** Comentar `DATA_DIR` en `.env`, reiniciar la API y comprobar que la tarjeta sigue mostrando el total. Volver a dejar la variable como estaba. No se tocan ni se mueven los archivos reales.
- [ ] **Step 7:** Comprobar en el navegador la tarjeta con datos reales: total, leyenda y avisos.
- [ ] **Step 8:** Revisar el repo antes de commitear: `git status` y `git diff --cached` sin `.env`, catálogo ni cantidades reales.
- [ ] **Step 9:** Documentar el volcado en `docs/base-de-datos.md` y actualizar `docs/roadmap.md`.
- [ ] **Step 10:** Commit: `Docs: volcado del historial y estado del roadmap`.
