# Patrimonio total, primera versión (solo spot)

> Este repo es público: los datos reales, las cantidades y el catálogo de activos reales viven en `DATA_DIR`, fuera del repo. Los tests y el seed usan datos inventados.

## Intención

Reemplazar el dato fijo de la tarjeta "Patrimonio total" del Dashboard por un valor calculado en el back: la suma, en USD, de los activos spot del historial real, valorizados al momento de la consulta.

Es un primer corte, para que la tarjeta consuma datos reales cuanto antes. El total **va a ser parcial, y la tarjeta tiene que decirlo**.

## Alcance

**Entra**
- Levantar Postgres y crear el servidor NestJS en `apps/api`.
- Volcar una vez el historial spot real a la base local. De ahí en adelante, la base es la única fuente de datos de la app.
- Calcular la tenencia neta por activo y valorizarla con precios en vivo.
- Conectar solo la tarjeta de patrimonio del Dashboard.

**No entra**
- Depósitos, extracciones y transferencias.
- Stablecoins y pesos: sin depósitos no se pueden calcular.
- Bienes físicos: se agregan en la próxima versión.
- Futuros, incluido su resultado.
- Precio promedio y ganancias.
- Lectura de exchanges por API.
- El resto de las tarjetas: siguen con datos de prueba.

**Sería un fracaso si**
- La tarjeta muestra un total parcial como si fuera completo.
- Se sube un dato real al repo.
- Un monto se calcula con `number` en vez de decimal exacto.

## Decisiones de Tomás

- Fuente de datos: historial real, solo spot, sin considerar depósitos ni extracciones.
- Si falla la API de precios: usar el último precio guardado y avisar qué activo está desactualizado y desde cuándo.
- CEDEARs: `(cantidad ÷ ratio) × precio en USD del subyacente`. El ratio de cada CEDEAR se carga en el catálogo local.
- Fondos sin fuente de precio: valor manual de la cuotaparte en USD, con la fecha del valor visible.
- Bienes físicos: afuera en esta versión.

## Cómo funciona

```
Volcado único, fuera de la app:
historial/spot.csv + catálogo (DATA_DIR) ──► pnpm db:volcar ──► Postgres

Uso normal de la app:
Postgres ──► motor de posiciones ──► valuador ──► GET /patrimonio ──► tarjeta
                                        ▲
                     API de precios / precios guardados / valores manuales
```

**El servidor y la tarjeta leen solo de la base.** Ni el servidor ni el front abren archivos, y ninguno consulta la Google Sheet.

### Volcado inicial

`spot.csv` es el archivo que genera `scripts/armar-historial.mjs` a partir de los exports de los exchanges. No es la Google Sheet.

Comando `pnpm db:volcar`, que se corre a mano. Es la única pieza que lee `DATA_DIR`: carga `spot.csv` y el catálogo a la base, y después la app no vuelve a necesitar esos archivos.

- **Se puede repetir sin duplicar:** cada fila guarda el `id` del CSV en una columna nueva, `idExterno`, con restricción única. Sirve para sumar exports nuevos más adelante.
- **Atómico:** todo entra en una transacción. Si una fila falla, no entra ninguna y se informan todos los errores.
- **Catálogo:** `DATA_DIR/catalogo-activos.csv` define, por símbolo, el tipo, el ratio, de dónde sale el precio y a qué símbolo se unifica. Se vuelca a la tabla `activos`. Un símbolo que no esté en el catálogo corta el volcado.
- **Unificación:** la base guarda el símbolo principal, así el motor no necesita leer el catálogo.

### Cambios en la base

- `Movimiento.idExterno`: texto opcional y único.
- `TipoMovimiento.AJUSTE`: acreditación sin costo; suma cantidad y no lleva precio.
- `Activo.ratio`: decimal opcional, solo para CEDEARs.
- `Activo.fuentePrecio`: `CRIPTO`, `BOLSA` o `MANUAL`.
- `Activo.simboloPrecio`: el identificador del activo en el proveedor.
- Tabla `precios`: último precio conocido por activo (`activoId`, `precioUsd`, `obtenidoEn`, `origen`). También guarda los valores manuales, con `origen = MANUAL`.

### Motor de posiciones

Función pura, sin acceso a la base ni a la red, para poder testearla sola.

- `COMPRA` y `AJUSTE` suman; `VENTA` resta.
- `cantidad` ya viene neta de comisiones: el motor no las vuelve a restar.
- No se descuenta el activo con el que se pagó.
- Consolida por activo, sumando todas las cuentas.
- Las especies en pesos y en dólares de un mismo bono llegan unificadas desde el volcado, y en una operación MEP se cancelan entre sí.
- **Saldo negativo:** cuenta como 0 y se informa, porque indica una compra que falta en los exports.

### Valuación y precios

- Cada consulta pide precios al proveedor, con un caché de 60 segundos para no exceder sus límites. Cada precio obtenido se guarda en `precios`.
- Si el proveedor falla para un activo, se usa el último precio guardado y el activo se marca como desactualizado.
- Si tampoco hay precio guardado, el activo no suma y se informa como sin valorizar.
- Los proveedores quedan detrás de una interfaz, para poder cambiarlos sin tocar el cálculo.
- Las claves de API van en `.env`, nunca en el repo.

### Endpoint `GET /patrimonio`

Los montos viajan como texto, para no perder precisión en JSON.

```json
{
  "totalUsd": "1234.56",
  "calculadoEn": "2026-11-06T18:00:00.000Z",
  "parcial": true,
  "activos": [
    { "simbolo": "AAA", "cantidad": "1.5", "precioUsd": "100", "valorUsd": "150", "origenPrecio": "API", "precioDel": "2026-11-06T18:00:00.000Z" }
  ],
  "avisos": {
    "desactualizados": [{ "simbolo": "BBB", "precioDel": "2026-11-05T12:00:00.000Z" }],
    "sinValorizar": ["CCC"],
    "saldosNegativos": ["DDD"]
  }
}
```

`parcial` es siempre `true` en esta versión. El servidor escucha solo en `localhost` y no tiene autenticación, así que no se expone a la red.

### Tarjeta en Angular

- `DashboardService` pide `/patrimonio` por HTTP, con un proxy de desarrollo hacia NestJS.
- Muestra el total real y la leyenda de que incluye solo activos spot.
- La fila "Cartera de inversión" muestra el mismo total. "Bienes físicos y fiat" se oculta en esta versión.
- Muestra los avisos si los hay, y estados de carga y de error.
- Si el back no responde, muestra el error: nunca vuelve al dato de prueba.
- Las otras tarjetas no cambian.

## Pruebas

- **Motor:** suma y resta, comisiones sin doble descuento, `AJUSTE` y saldo negativo.
- **Valuador:** ratio de CEDEAR, valor manual, caída del proveedor con y sin precio guardado, y exactitud decimal.
- **Volcado:** repetirlo sin duplicar, unificación de símbolos, símbolo fuera de catálogo y rollback ante un error.
- **De punta a punta:** con datos inventados y los archivos de `DATA_DIR` no disponibles, el total de la tarjeta sale de la base y coincide con una cuenta hecha a mano.
- **Con datos reales:** las tenencias en la base coinciden con el cálculo directo sobre el CSV. Esta comprobación se hace en local y su resultado no entra al repo.

## A criterio de quien lo construya

- El proveedor de precios cripto y el de bolsa. Hay que comprobar que cubren todos los activos del catálogo local y sus límites gratuitos. Si alguno pide una clave, Tomás la crea y la carga en `.env`.
- La estructura interna de módulos de NestJS.
- El texto exacto de la leyenda y de los avisos.

## Antes de usarlo con datos reales

- Docker Desktop abierto, o instalado si no está.
- `DATA_DIR` configurado en `apps/api/.env`, solo para correr el volcado.
- `catalogo-activos.csv` en `DATA_DIR`, con el ratio de cada CEDEAR.
- `pnpm db:volcar` corrido una vez.
- Valor actual de la cuotaparte de cada fondo manual, en USD.
