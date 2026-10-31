# Base de datos

Guía paso a paso para levantar la base en tu máquina y entender cómo está armada.

## 1. Levantar Postgres (una sola vez)

Necesitás Postgres corriendo. Hay dos caminos; elegí uno:

- **Docker Desktop (recomendado):** instalalo, abrilo y, desde la raíz del repo, corré:
  ```bash
  docker compose up -d
  ```
  Esto lee `docker-compose.yml` y levanta un Postgres 16 con usuario `finanzas`, contraseña `finanzas_dev` y base `finanzas`. Para apagarlo: `docker compose down` (los datos se conservan).
- **Instalador nativo de Windows** (postgresql.org): después creá un usuario y una base con esos mismos datos, o cambiá `DATABASE_URL` en el `.env`.

## 2. Configurar la conexión

```bash
cp apps/api/.env.example apps/api/.env
```

El `.env` le dice a la app dónde está la base. **Nunca se sube al repo.**

## 3. Instalar, crear tablas y cargar datos de prueba

Desde la raíz del repo:

```bash
pnpm install
```

```bash
pnpm db:migrate
```

```bash
pnpm db:seed
```

- `pnpm install` baja las dependencias y genera el cliente de Prisma.
- `pnpm db:migrate` aplica las migraciones (crea las tablas). Si cambiaste el schema, también crea una migración nueva.
- `pnpm db:seed` carga los movimientos **inventados** de `apps/api/prisma/datos-prueba/movimientos.csv`. Si la tabla ya tiene datos, no hace nada.

Para mirar los datos con una interfaz visual: `pnpm db:studio` (abre Prisma Studio en el navegador).

Para borrar todo y empezar de cero (solo en desarrollo): `pnpm db:reset`.

## Cómo está armada

```
cuentas ─┐                  ┌─ activos
         │                  │
         └──< movimientos >─┘
```

| Tabla | Qué guarda |
|---|---|
| `cuentas` | Dónde está cada activo: exchange, bróker o wallet. |
| `activos` | BTC, ETH, USDT, IBIT... con su tipo (cripto, stablecoin, CEDEAR...). |
| `movimientos` | El registro único: cada compra, venta, transferencia, resultado de futuros, reward, aporte o comisión. |

El detalle de cada columna está comentado en [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma).

### Reglas que garantiza la base

Además de los tipos de dato, Postgres rechaza cualquier movimiento que rompa estas reglas (están en la migración inicial, como `CHECK`):

- La `cantidad` siempre es positiva y el `tipo` dice si suma o resta. **Excepción:** `PNL_FUTUROS` lleva signo (negativo = pérdida).
- `COMPRA` y `VENTA` siempre tienen precio.
- Precio y comisión nunca son negativos; si hay comisión, se indica en qué activo se cobró.
- Solo una `TRANSFER` tiene cuenta destino, y siempre la tiene. No se transfiere a la misma cuenta.
- No se puede borrar un activo o una cuenta que tenga movimientos.

### Formato del CSV de movimientos

| Columna | Ejemplo | Notas |
|---|---|---|
| `fecha` | `2025-01-12T11:30:00-03:00` | ISO con zona horaria, obligatoria. |
| `tipo` | `COMPRA` | `COMPRA`, `VENTA`, `TRANSFER`, `PNL_FUTUROS`, `REWARD`, `APORTE`, `COMISION`. |
| `activo` | `BTC` | Tiene que existir en el catálogo. |
| `cantidad` | `0.01` | Punto decimal, sin separador de miles. |
| `precio` | `60000` | Opcional, salvo en compras y ventas. |
| `moneda` | `USD` | `USD` (por defecto) o `ARS`. |
| `comision` / `comision_activo` | `0.6` / `USDT` | Van juntas o vacías. |
| `cuenta` / `cuenta_destino` | `Bitunix` / `Cold wallet` | Destino solo en `TRANSFER`. |
| `estrategia` | `Estrategia A` | Opcional, para agrupar futuros. |
| `nota` | | Texto libre. |

> Este formato es el de la app. El importador de la exportación de la hoja de cálculo real es un paso aparte del roadmap.
