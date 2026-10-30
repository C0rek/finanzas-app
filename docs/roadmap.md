# Roadmap

## v0 — Fundaciones
- [x] Confirmar el stack
- [x] Preparar el entorno: Node y pnpm
- [ ] Preparar el entorno: Postgres en Windows
- [ ] Bocetos del dashboard en Figma
- [ ] Monorepo inicial (`apps/web`, `apps/api`, `packages/shared`)

## v1 — Base
- [ ] Modelo de datos: tabla única de movimientos (decimales exactos)
- [ ] Importador desde la exportación CSV de la hoja de cálculo
- [ ] Motor de posiciones: precio promedio, ganancia realizada y no realizada, saldos por exchange
- [ ] Precios automáticos por API
- [ ] Dashboard: patrimonio vs. cartera de inversión, reparto, exposición a BTC, tabla de posiciones

## v2 — Exchanges y trading
- [ ] Sincronización con Bitunix (solo lectura): saldos, posiciones, historial de futuros
- [ ] Resumen mensual de trading (resultado, win rate, comisiones, por estrategia)

## v3 — Bróker y metas
- [ ] Integración con el bróker (CEDEARs, por ejemplo IBIT y SPY)
- [ ] Meta de aporte mensual (% del sueldo invertido)

## v4 — Custodia y alertas
- [ ] Saldo de cold wallet desde la blockchain (solo clave pública)
- [ ] Alertas de rebalanceo y toma de ganancias
