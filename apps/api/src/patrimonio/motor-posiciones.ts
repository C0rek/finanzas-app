// Motor de posiciones: a partir de los movimientos calcula cuánto tenés de cada activo.
//
// Es una función "pura": no toca la base ni la red, solo recibe datos y devuelve datos.
// Por eso se puede testear sola. Las cantidades nunca se guardan: se derivan siempre
// de los movimientos, así no pueden quedar desincronizadas.
import { Decimal } from "../decimal.js";
import { ordenarParaReproducir } from "./costos.js";

export type MovimientoPosicion = {
  simbolo: string;
  tipo: string;
  cantidad: string;
  // Lo que sigue es opcional: solo hace falta para seguir la liquidez (ver SALDO más abajo).
  fecha?: Date;
  cuenta?: string;
  simboloPago?: string | null; // con qué se pagó o en qué se cobró (ej.: USDT)
  total?: string | null; // cuánto, en ese activo
  comision?: string | null;
  simboloComision?: string | null;
};
export type Posicion = { simbolo: string; cantidad: Decimal };
export type ResultadoPosiciones = { posiciones: Posicion[]; saldosNegativos: string[] };

// Solo operaciones spot. `cantidad` ya viene neta de comisiones: no se vuelven a restar.
const EFECTO: Record<string, 1 | -1> = { COMPRA: 1, AJUSTE: 1, VENTA: -1 };

/**
 * Cómo se sigue la liquidez (ej.: USDT en Bitunix):
 * - No tenemos el historial de depósitos y retiros, así que el saldo arranca con un SALDO:
 *   "a esta fecha tengo 500 USDT en un exchange (ejemplo)". Pisa todo lo anterior de ese activo en esa cuenta.
 * - Desde ese momento, cada compra pagada con USDT en esa cuenta le descuenta el total
 *   (y cada venta se lo suma). La compra sigue siendo UN solo movimiento.
 * - Antes del primer SALDO, el activo de pago no se toca: las compras viejas no lo dejan negativo.
 */
export function calcularPosiciones(movimientos: MovimientoPosicion[]): ResultadoPosiciones {
  // Saldo por activo y cuenta. Al final se suman las cuentas de cada activo.
  const saldos = new Map<string, Decimal>();
  const seguidos = new Set<string>(); // activo y cuenta que ya tienen un SALDO
  const clave = (simbolo: string, cuenta = "") => `${simbolo}\u0000${cuenta}`;
  const sumar = (k: string, valor: Decimal) => saldos.set(k, (saldos.get(k) ?? new Decimal(0)).plus(valor));

  const conFecha = movimientos.map((m) => ({ ...m, fecha: m.fecha ?? new Date(0) }));
  for (const m of ordenarParaReproducir(conFecha)) {
    const k = clave(m.simbolo, m.cuenta);
    if (m.tipo === "SALDO") {
      saldos.set(k, new Decimal(m.cantidad));
      seguidos.add(k);
      continue;
    }
    const efecto = EFECTO[m.tipo];
    if (efecto === undefined) continue;
    sumar(k, new Decimal(m.cantidad).times(efecto));

    const kPago = m.simboloPago ? clave(m.simboloPago, m.cuenta) : null;
    if (kPago && seguidos.has(kPago) && m.total && m.tipo !== "AJUSTE") {
      // Comprar resta lo pagado; vender suma lo cobrado. Una comisión cobrada en el activo de pago, resta.
      sumar(kPago, new Decimal(m.total).times(-efecto));
      if (m.comision && m.simboloComision === m.simboloPago) sumar(kPago, new Decimal(m.comision).negated());
    }
  }

  const porActivo = new Map<string, Decimal>();
  for (const [k, cantidad] of saldos) {
    const simbolo = k.split("\u0000")[0]!;
    porActivo.set(simbolo, (porActivo.get(simbolo) ?? new Decimal(0)).plus(cantidad));
  }

  const posiciones: Posicion[] = [];
  const saldosNegativos: string[] = [];
  for (const simbolo of [...porActivo.keys()].sort()) {
    const cantidad = porActivo.get(simbolo)!;
    if (cantidad.isPositive() && !cantidad.isZero()) posiciones.push({ simbolo, cantidad });
    // Negativo = hay una venta cuya compra no está en los exports. Cuenta como 0 y se informa.
    else if (cantidad.isNegative() && !cantidad.isZero()) saldosNegativos.push(simbolo);
  }
  return { posiciones, saldosNegativos };
}
