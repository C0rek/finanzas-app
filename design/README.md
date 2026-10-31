# Diseño

Los bocetos se hacen en [Pencil](https://pencil.dev) y se guardan como archivos `.pen` en esta carpeta. Solo con datos de prueba: nunca capturas ni montos reales.

## Alcance de diseño de la v1

### Pantallas
| Pantalla | Estado | Contenido |
|---|---|---|
| Dashboard | ✅ Diseñada | Patrimonio total vs. cartera de inversión, reparto, exposición a BTC |
| Movimientos | ✅ Diseñada | Registro único de movimientos |

### Pendiente (modales y estados, no pantallas nuevas)
- [ ] **Tabla de posiciones**: confirmar si está en el Dashboard (cantidad, precio promedio, ganancia realizada y no realizada).
- [ ] **Importar CSV** (modal o drawer desde Movimientos): elegir archivo → vista previa → errores por fila → confirmar → resumen ("se importaron 120, se saltearon 3").
- [ ] **Formulario de movimiento** (modal o drawer): tipo, fecha, activo, exchange, cantidad, precio, comisión. Los campos cambian según el tipo (una transferencia no tiene precio y sí origen y destino).
- [ ] **Estados** de cada pantalla: vacío (primera vez, invita a importar), cargando y error (por ejemplo, si falla la API de precios se muestra el último precio con su antigüedad).

### Fuera de la v1
- Detalle de activo
- Login y configuración (la app corre local y es de un solo usuario)
- Resumen mensual de trading (v2)
