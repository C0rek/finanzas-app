// Motor de posiciones: a partir de los movimientos calcula cuánto tenés de cada activo.
//
// Es una función "pura": no toca la base ni la red, solo recibe datos y devuelve datos.
// Por eso se puede testear sola. Las cantidades nunca se guardan: se derivan siempre
// de los movimientos, así no pueden quedar desincronizadas.
import { Decimal } from "decimal.js";

export type MovimientoPosicion = { simbolo: string; tipo: string; cantidad: string };
export type Posicion = { simbolo: string; cantidad: Decimal };
export type ResultadoPosiciones = { posiciones: Posicion[]; saldosNegativos: string[] };

// Solo operaciones spot. `cantidad` ya viene neta de comisiones: no se vuelven a restar.
const EFECTO: Record<string, 1 | -1> = { COMPRA: 1, AJUSTE: 1, VENTA: -1 };

export function calcularPosiciones(movimientos: MovimientoPosicion[]): ResultadoPosiciones {
  const saldos = new Map<string, Decimal>();
  for (const { simbolo, tipo, cantidad } of movimientos) {
    const efecto = EFECTO[tipo];
    if (efecto === undefined) continue;
    saldos.set(simbolo, (saldos.get(simbolo) ?? new Decimal(0)).plus(new Decimal(cantidad).times(efecto)));
  }

  const posiciones: Posicion[] = [];
  const saldosNegativos: string[] = [];
  for (const simbolo of [...saldos.keys()].sort()) {
    const cantidad = saldos.get(simbolo)!;
    if (cantidad.isPositive() && !cantidad.isZero()) posiciones.push({ simbolo, cantidad });
    // Negativo = hay una venta cuya compra no está en los exports. Cuenta como 0 y se informa.
    else if (cantidad.isNegative() && !cantidad.isZero()) saldosNegativos.push(simbolo);
  }
  return { posiciones, saldosNegativos };
}
