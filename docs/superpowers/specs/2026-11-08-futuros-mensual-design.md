# Resultado mensual de futuros (etapa de datos)

> Este repo es público. Los datos reales (exports, nombres de subcuentas, montos) viven en `DATA_DIR`, fuera del repo. Los tests usan datos inventados.

## Intención

Tomás quiere ver **cuánto ganó o perdió en futuros cada mes**: un solo número por mes, que sume todas las cuentas y exchanges. Hoy lo lleva a mano en la Google Sheet y quiere que salga de la app.

Esta etapa deja los datos cargados y verificados en la base, y una consulta en la API que devuelve el resultado de cada mes. La tarjeta del dashboard y la pestaña de futuros vienen después, a partir de un boceto de Pencil que todavía no existe.

Hoy Tomás solo opera en Bitunix, en futuros USDⓈ-M y coin-M. El resto de las cuentas es historial.

## Alcance

**Entra**
- Separar las cuentas en la base: una por cuenta real, incluidas las subcuentas (Bitunix: una cuenta principal y dos subcuentas; BingX: dos cuentas; Binance; Blofin).
- Pasar a la base el resultado de los futuros **cerrados** de todas las cuentas con export.
- Que el resultado de los futuros coin-M modifique la cantidad de la moneda en el motor de posiciones (y con eso, Patrimonio y Exposición a BTC).
- Un endpoint con el resultado neto mensual.
- Un informe de conciliación por cuenta, para verificar la carga.

**No entra**
- Posiciones abiertas y su resultado sin realizar.
- Saldo de USDT y stablecoins; por eso el resultado de futuros USDⓈ-M **no** impacta en Patrimonio.
- Depósitos, retiros, transferencias y Earn: es la etapa siguiente.
- Pantallas: tarjeta y pestaña de futuros.
- Mostrar el resultado separado por cuenta.

**Meta a futuro (que esta etapa no cierre el camino):** que Patrimonio contemple todo, incluido el resultado sin realizar de las posiciones abiertas (por ejemplo, un BTC-USDT a −20 %).

**Sería un fracaso si**
- Un mes al que le faltan datos se muestra como si estuviera completo.
- Un resultado se cuenta dos veces porque aparece en dos exports.
- Una pérdida en coin-M no baja la cantidad de BTC en Patrimonio.
- Se sube al repo un dato real o un nombre de subcuenta.
- Un monto se calcula con `number` en vez de decimal exacto.

## Decisiones de Tomás

- **Un número por mes**, sumando todo. Sin desglose por cuenta en la vista.
- **Resultado neto:** PnL realizado menos comisiones, menos funding; una liquidación cuenta como pérdida.
- **Solo posiciones cerradas** en esta etapa.
- **Coin-M impacta en Patrimonio; USDⓈ-M no**, hasta que la app lleve el saldo de USDT.
- **Operaciones pagadas con cupón o bono:** si ganan, cuenta la ganancia; si pierden, cuentan 0 (la pérdida la absorbe el bono).
- **Blofin:** no hay historial recuperable. Se carga a mano el único dato: un long de BTC-USDT de agosto de 2026 cerrado por TP alrededor del 19/08, con el resultado anotado en la Sheet (el monto está en `DATA_DIR`, no acá).
- **Mes en hora argentina** (UTC−3).
- **Mes de cierre:** el resultado de una posición va al mes en que se cierra.
- **Meses incompletos** se marcan como tales.
- **Moneda:** todo en USD; el USDT se toma como dólar.

## Cómo funciona

```
exports (DATA_DIR) ─► armar-historial.mjs ─► historial/futuros.csv ─┐
                                                                   ├─► pnpm db:volcar ─► Postgres
historial/spot.csv ────────────────────────────────────────────────┘
                                                                         │
Postgres ─► motor de posiciones (coin-M suma/resta la moneda) ─► /patrimonio
Postgres ─► resumen mensual ─────────────────────────────────────► GET /futuros/mensual
```

Igual que en spot: el servidor solo lee la base; el único que lee `DATA_DIR` es el volcado.

### 1. Cuentas separadas

- La base hoy tiene una cuenta por exchange (`BINANCE`, `BINGX`, `BITUNIX`…). Pasa a tener una por cuenta real.
- El nombre de cada cuenta y a qué exchange pertenece se definen en un archivo de `DATA_DIR` (no en el código), porque los alias de subcuenta son datos personales.
- Los movimientos spot ya cargados se reasignan a su cuenta real. Con los exports actuales, la compra spot de BingX es de una cuenta y todas las de Bitunix son de la cuenta principal; el archivo de cuentas lo explicita.
- `historial/spot.csv` y `futuros.csv` llevan la cuenta en cada fila.
- **Ubicación en Patrimonio (decisión de Claude):** `Cuenta` suma un campo con el exchange. Patrimonio y Exposición a BTC siguen mostrando y agrupando por exchange ("Bitunix"), nunca por alias de subcuenta.

### 2. `historial/futuros.csv`

Hoy existe con 192 cierres armados desde CSV viejos de BingX y Bitunix, pero no incluye los exports nuevos (JSON de Bitunix, BingX y Binance COIN-M, y el ledger de BingX por cuenta). Hay que ampliar `armar-historial.mjs` para leerlos.

Cada fila es un **resultado** con: id único de la fuente, cuenta, fecha y hora UTC, moneda del resultado (USDT, BTC, ETH, DOT…), monto neto con signo en esa moneda, precio en USD de esa moneda al momento (solo coin-M), si fue con cupón, y la fuente.

**Granularidad (decisión de Claude):** los exports nuevos son libros de movimientos (PnL, comisión y funding por separado), no posiciones. Se carga un resultado por evento del libro, con el id original del exchange. Así no hay que reconstruir posiciones y el id garantiza que no se duplique. Consecuencia: el funding y las comisiones se imputan al mes en que se cobraron, que en la práctica es casi siempre el mes de cierre. Donde la fuente sí trae posiciones cerradas (CSV viejos de BingX), se usa una fila por posición.

**Sin solapamiento:** varios exports cubren los mismos días (por ejemplo, el CSV de posiciones de Bitunix y el libro de la misma subcuenta). Para cada cuenta y período se usa **una sola fuente**, la más completa; la regla queda escrita en el script.

**Cupones (decisión de Claude sobre cómo aplicar la regla de Tomás):**
- **Fuentes que son libros de saldo** (Bitunix, el export por cuenta de BingX): se cargan todos los eventos ligados al cupón o bono que mueven el saldo real. Por ejemplo, en Bitunix "Transferencia de margen de cupón", "Recuperación del margen de cupón", "Beneficio y pérdida de la posición del cupón" y "Fondo de juicio"; en BingX, "Bonus Profit" y "Trial Fund". El exchange absorbe las pérdidas del bono, así que lo que llega al saldo ya cumple la regla: la ganancia entra y la pérdida neta queda en 0. Además, la conciliación cierra exacta.
- **Fuentes por posición** (CSV viejos de BingX con "Coupon Orders", JSON de BingX con `isCoupon`/`bonusOrder`): se aplica la regla directo. Si el resultado de la posición es positivo, se carga; si no, se carga 0.

**Coin-M a USD (decisión de Claude):** el libro no trae precio. El script busca el precio histórico de la moneda en el momento del evento, en una API pública de velas (Binance), y lo guarda en el CSV. Se hace una sola vez al armar el historial, no en cada consulta, para que el número no cambie solo.

**Blofin:** fila manual en `exports/manual/`, como las operaciones spot cargadas a mano.

### 3. Base y volcado

- Cada fila de `futuros.csv` se vuelca como un movimiento `PNL_FUTUROS`: `cantidad` con signo en la moneda del resultado, `totalUsd` con su valor en USD, la cuenta real e `idExterno`.
- Mismas garantías que el volcado spot: repetible sin duplicar, atómico y con los errores informados juntos.
- **Meses incompletos:** un archivo de `DATA_DIR` lista, por cuenta, los períodos sin datos. Se vuelca a una tabla nueva. Un mes es incompleto si se pisa con algún período sin datos. Es manual porque solo Tomás sabe si operó o no en un hueco.

### 4. Motor de posiciones

- `PNL_FUTUROS` en una moneda que no es stablecoin (BTC, ETH, DOT…) **suma o resta esa cantidad**, con su signo.
- `PNL_FUTUROS` en USDT u otra stablecoin no afecta las posiciones.
- No cambia el costo promedio de la moneda: es una ganancia o pérdida, no una compra.

### 5. Endpoint `GET /futuros/mensual`

Montos como texto, igual que el resto de la API.

```json
{
  "meses": [
    { "mes": "2026-09", "resultadoUsd": "123.45", "incompleto": false },
    { "mes": "2026-07", "resultadoUsd": "-10.00", "incompleto": true }
  ],
  "calculadoEn": "2026-11-08T13:00:00.000Z"
}
```

- Ordenado del mes más reciente al más viejo.
- Los meses sin movimientos y sin huecos no aparecen.

### 6. Cuentas sin historial completo (decisión de Tomás)

- **Binance COIN-M:** el export trae solo los últimos ~3 meses, pero Tomás confirma que esos son todos los movimientos que hizo (casi todos en DOT). Se toma como completo.
- **BingX T:** se toma como verdadero lo que trae el export. Los huecos conocidos se cargan como períodos sin datos, así esos meses salen marcados como incompletos, y Tomás pide esos períodos para completarlos.
- En las dos, la conciliación se informa pero no frena el volcado.

### 7. Verificación con datos reales

`armar-historial.mjs` imprime una **conciliación por cuenta**: lo que entró menos lo que salió (transferencias y depósitos del libro) más el resultado de futuros tiene que dar el saldo final conocido. Por ejemplo, una cuenta que terminó en cero tiene que dar exactamente su resultado neto como diferencia entre entradas y salidas. Si una cuenta no cierra, se informa y se decide con Tomás antes de volcar. Los saldos finales de referencia salen de los exports o de capturas de Tomás, y quedan en `DATA_DIR`.

## Pruebas

- **Motor:** `PNL_FUTUROS` en BTC suma y resta; en USDT no afecta; una pérdida que deja el saldo negativo se informa igual que hoy.
- **Resumen mensual:** corte de mes en hora argentina (un cierre el 31 a las 23:00 cuenta en ese mes), conversión a USD, marca de incompleto.
- **Volcado:** repetirlo sin duplicar, cuenta inexistente en el archivo de cuentas, reasignación de los movimientos spot existentes, rollback ante error.
- **Script (en local, con datos reales):** la conciliación de cada cuenta cierra; ningún id repetido entre fuentes. El resultado no entra al repo.
- **De punta a punta:** con datos inventados, `GET /futuros/mensual` coincide con una cuenta hecha a mano.

## A criterio de quien lo construya

- El nombre y la forma de los archivos nuevos en `DATA_DIR` (cuentas, períodos sin datos, saldos de referencia).
- La migración para separar cuentas: cómo se reasignan los movimientos existentes sin perder `idExterno`.
- La estructura interna del módulo de NestJS.
- El intervalo de vela para el precio histórico (1 minuto si la API lo permite).

## Antes de usarlo con datos reales

- Export de Bitunix desde el 06/11/2026 hasta el día de la carga.
- Tomás completa el archivo de períodos sin datos (los huecos conocidos están en `PENDIENTES.md` de `DATA_DIR`).
- Respaldo de la base antes del primer volcado con cuentas separadas.
