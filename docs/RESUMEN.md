# Resumen del proyecto (leer primero)

Nonio: app de finanzas personales (cripto + mercado dolarizado). Monorepo pnpm.
Repo público: datos reales afuera (`DATA_DIR` en `.env`, carpeta `C:\dev\finanzas-datos`).

## Stack
- `apps/api`: NestJS + Prisma + PostgreSQL (docker-compose). Tests con Vitest (`*.spec.ts`).
- `apps/web`: Angular 20 standalone + Signals, SCSS con tokens en `src/styles/_tokens.scss`.
- Montos: siempre decimal exacto (`apps/api/src/decimal.ts`, pipes en `apps/web/src/app/compartido/formato/`).

## API (`apps/api/src`)
| Carpeta | Qué hace |
|---|---|
| `patrimonio/` | Endpoints `patrimonio`, `patrimonio/exposicion-btc`, `patrimonio/evolucion`, `posiciones`. Lógica pura: `motor-posiciones`, `costos`, `valuador`, `evolucion`, `exposicion-btc`. |
| `movimientos/` | `GET /movimientos`; `armar-movimientos` arma la vista (impacto del pago, saldo por cuenta). |
| `precios/` | Proveedores Binance (cripto) y Finnhub (acciones/ETF) detrás de `proveedor-precios`. |
| `bitunix/` | Cliente de API de solo lectura de Bitunix. |
| `volcado/` | Importa historial CSV de exchanges a la base (`pnpm db:volcar`). |
| `comun/`, `prisma.ts` | Helpers de respuesta y cliente Prisma. Inyección por tokens en `app.module.ts`. |

Modelos Prisma: `Cuenta`, `Activo`, `Precio`, `Movimiento` (+ enums de tipo, grupo, fuente, moneda).
Datos de prueba: `apps/api/prisma/datos-prueba/`, `apps/api/test/fixtures/`.

## Web (`apps/web/src/app`)
- `paginas/`: `dashboard` (secciones patrimonio, resultado, exposición BTC, evolución, tabla de posiciones), `movimientos`, `posiciones`.
- `servicios/`: llamadas a la API, `modelos.ts` (tipos), `sincronizacion.service` (recarga global), `datos-prueba/`.
- `compartido/`: card, encabezado, esqueleto, avisos, botón sincronizar, pipes de formato, animaciones.
- `layout/`: barra superior y riel de navegación.

## Reglas de dominio clave
- Patrimonio = spot + transferencias + PnL de futuros por posición.
- Liquidez solo cuenta USDT.
- UI nueva: seguir el estilo de las páginas existentes (skill `crear-pantalla`). Bocetos de Pencil y `design/` desactualizados.

## Comandos
`pnpm dev:api` · `pnpm db:migrate|seed|reset|volcar|studio` · web: `pnpm --filter web start`.

## Más detalle (leer solo si hace falta)
`docs/arquitectura.md`, `docs/base-de-datos.md`, `docs/roadmap.md`, `docs/AUDITORIA.md`, specs en `docs/superpowers/`.
