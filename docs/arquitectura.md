# Arquitectura (borrador)

## Principios
1. **Un único registro de movimientos.** Posiciones, precios promedio y ganancias se calculan a partir de ahí; nunca se cargan a mano.
2. **Decimales exactos.** Todos los montos y cantidades usan decimal (NUMERIC en Postgres, `Prisma.Decimal` / decimal.js en TS), nunca `number` float.
3. **Código y datos separados.** Los datos reales viven fuera del repo (`DATA_DIR` en `.env`). El repo trae datos de prueba.
4. **Solo lectura hacia los exchanges.** Las claves de API nunca tienen permiso de operar ni de retirar, y nunca se suben al repo.

## Tipos de movimiento (borrador)
`COMPRA` · `VENTA` · `TRANSFER` (entre exchanges o wallets) · `PNL_FUTUROS` (resultado de futuros, incluidos los coin-margined) · `REWARD` (intereses/earn) · `APORTE` (entrada de fiat) · `COMISION`

## Estructura prevista
```
apps/
  web/        Angular: dashboard y carga de datos
  api/        NestJS: dominio, importadores, sync con exchanges, jobs de precios
packages/
  shared/     tipos del dominio y cálculos compartidos (precio promedio, ganancias)
design/       exportaciones de Figma
docs/
```
