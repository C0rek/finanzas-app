# Roadmap

## v0 — Fundaciones
- [x] Confirmar el stack
- [x] Preparar el entorno: Node y pnpm
- [ ] Preparar el entorno: Postgres en Windows (`docker-compose.yml` listo; ver `docs/base-de-datos.md`)
- [x] Bocetos en Pencil: dashboard y movimientos
- [ ] Bocetos en Pencil: importar CSV, formulario de movimiento y estados (ver `design/README.md`)
- [ ] Monorepo inicial (`apps/web`, `apps/api`, `packages/shared`) — en curso: workspace de pnpm y `apps/api` con Prisma

## v1 — Base
- [x] Modelo de datos: tabla única de movimientos (decimales exactos) + datos de prueba
- [ ] Motor de posiciones: precio promedio, ganancia realizada y no realizada, saldos por exchange — en curso: cantidades spot por activo
- [x] Precios automáticos por API
- [ ] Dashboard: patrimonio vs. cartera de inversión, reparto, exposición a BTC, tabla de posiciones — en curso: tarjeta de patrimonio total, solo spot
- [ ] Futuros en el patrimonio: PnL de futuros por posición (decisión de MVP)
- [ ] Sincronización con Bitunix (solo lectura) para futuros: posiciones e historial (decisión de MVP; el cliente en `bitunix/` ya existe)

## Pospuesto (fuera del MVP)
- [ ] Importador desde la exportación CSV de la hoja de cálculo
- [ ] Botón "Nuevo movimiento": formulario para cargar movimientos (hoy deshabilitado con "Próximamente")

## v2 — Exchanges y trading
- [ ] Sincronización con Bitunix (solo lectura): saldos spot (futuros ya en v1)
- [ ] Resumen mensual de trading (resultado, win rate, comisiones, por estrategia)

## v3 — Bróker y metas
- [ ] Integración con el bróker (CEDEARs, por ejemplo IBIT y SPY)
- [ ] Meta de aporte mensual (% del sueldo invertido)

## v4 — Custodia y alertas
- [ ] Saldo de cold wallet desde la blockchain (solo clave pública)
- [ ] Alertas de rebalanceo y toma de ganancias
