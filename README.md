# finanzas-app

App de finanzas personales enfocada en cripto y mercado tradicional dolarizado: posiciones, precio promedio, ganancias realizadas y no realizadas, exposición total a Bitcoin y resumen mensual de trading.

> 🚧 **Estado:** planificación y diseño. Proyecto personal y de aprendizaje full stack (UX/UI → full stack).

## Qué va a resolver
- **Un solo registro de movimientos** (compras, ventas, transferencias, PnL de futuros, rewards) en lugar de hojas de cálculo frágiles.
- **Posiciones** por activo y por exchange, con precio promedio y ganancia realizada / no realizada.
- **Exposición total a BTC**: spot + margen en futuros + ETF (IBIT) + cold wallet.
- **Precios automáticos** por API, sin scraping.
- **Sincronización con exchanges** mediante claves de API de solo lectura (empezando por Bitunix).
- **Resumen mensual de trading**: resultado, win rate, comisiones, resultado por estrategia.
- **Dashboard** que separa patrimonio total de cartera de inversión.

## Stack
| Capa | Tecnología |
|---|---|
| Frontend | Angular 20+ (standalone, Signals) · Tailwind · ECharts · Lightweight Charts |
| Backend | NestJS (TypeScript) |
| Base de datos | PostgreSQL + Prisma |
| Monorepo | pnpm workspaces (`apps/web`, `apps/api`, `packages/shared`) |

## Roadmap
Ver [`docs/roadmap.md`](docs/roadmap.md).

## Privacidad
Este repo **no contiene datos financieros reales**: solo código y datos de prueba. Los datos reales viven fuera del repo y se leen desde una carpeta configurada en `.env` (`DATA_DIR`).
