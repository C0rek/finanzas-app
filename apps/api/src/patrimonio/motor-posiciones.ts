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
  // Lo que sigue es opcional: solo hace falta para seguir saldos por cuenta (liquidez, transferencias).
  fecha?: Date;
  cuenta?: string;
  cuentaDestino?: string | null; // TRANSFER: a qué cuenta llega
  simboloPago?: string | null; // con qué se pagó o en qué se cobró (ej.: USDT)
  total?: string | null; // cuánto, en ese activo
  comision?: string | null;
  simboloComision?: string | null;
};
export type Posicion = { simbolo: string; cantidad: Decimal };
export type SaldoEnCuenta = { cuenta: string; cantidad: Decimal };
export type ResultadoPosiciones = {
  posiciones: Posicion[];
  saldosNegativos: string[];
  // Cuánto queda de cada activo en cada cuenta (solo saldos positivos).
  porCuenta: Map<string, SaldoEnCuenta[]>;
};

/** Cuenta para lo que viene de afuera o se va afuera (origen o destino desconocido): no suma al patrimonio. */
export const CUENTA_EXTERNA = "EXTERNO";

// Stablecoins con que se paga: se siguen siempre por cuenta, porque los depósitos, retiros y el resultado de
// futuros ya están en los movimientos. Otros activos de pago (pesos, dólares del bróker) solo desde un SALDO.
const PAGO_SIEMPRE_SEGUIDO = new Set(["USDT", "USDC"]);

// Spot: `cantidad` ya viene neta de comisiones, no se vuelven a restar.
const EFECTO: Record<string, 1 | -1> = { COMPRA: 1, AJUSTE: 1, VENTA: -1 };

export type Efecto = { simbolo: string; cuenta: string; cambio: Decimal; esPago: boolean };

/**
 * Cómo mueve un movimiento los saldos de cada cuenta. Lo usan el motor y la pantalla de Movimientos,
 * así las dos cuentan igual. `seguido(simbolo, cuenta)` dice si ese activo de pago ya tiene SALDO ahí.
 * - COMPRA, AJUSTE y VENTA suman o restan el activo en su cuenta.
 * - PNL_FUTUROS suma con signo (ganancia o pérdida en la moneda de margen).
 * - TRANSFER resta en el origen lo que salió (lo que llegó más la comisión del camino) y suma en el destino
 *   lo que llegó. La cuenta EXTERNO no se sigue.
 * - El activo con que se pagó (ej.: USDT) se descuenta en la compra y se suma en la venta, si se sigue.
 *   Antes del primer SALDO, un activo de pago que no es stablecoin no se toca: así las compras viejas no lo dejan negativo.
 */
export function efectosDe(m: MovimientoPosicion, seguido: (simbolo: string, cuenta: string) => boolean): Efecto[] {
  const cuenta = m.cuenta ?? "";
  const cantidad = new Decimal(m.cantidad);
  const efectos: Efecto[] = [];
  const agregar = (simbolo: string, c: string, cambio: Decimal, esPago = false) => {
    if (c !== CUENTA_EXTERNA && !cambio.isZero()) efectos.push({ simbolo, cuenta: c, cambio, esPago });
  };

  if (m.tipo === "PNL_FUTUROS") agregar(m.simbolo, cuenta, cantidad);
  if (m.tipo === "TRANSFER") {
    const perdida = m.comision && m.simboloComision === m.simbolo ? new Decimal(m.comision) : new Decimal(0);
    agregar(m.simbolo, cuenta, cantidad.plus(perdida).negated());
    if (m.cuentaDestino) agregar(m.simbolo, m.cuentaDestino, cantidad);
  }
  const efecto = EFECTO[m.tipo];
  if (efecto !== undefined) {
    agregar(m.simbolo, cuenta, cantidad.times(efecto));
    const pago = m.simboloPago;
    if (pago && m.total && m.tipo !== "AJUSTE" && (PAGO_SIEMPRE_SEGUIDO.has(pago) || seguido(pago, cuenta))) {
      // Comprar resta lo pagado; vender suma lo cobrado. Una comisión cobrada en el activo de pago, resta.
      let cambio = new Decimal(m.total).times(-efecto);
      if (m.comision && m.simboloComision === pago) cambio = cambio.minus(m.comision);
      agregar(pago, cuenta, cambio, true);
    }
  }
  return efectos;
}

/**
 * Reproduce el historial y devuelve el saldo de cada activo en cada cuenta.
 * Un SALDO fija la cantidad de un activo en una cuenta a esa fecha (lo que muestra el exchange):
 * pisa lo que diga la reconstrucción. Sirve de control cuando faltan exports.
 */
export function calcularPosiciones(movimientos: MovimientoPosicion[]): ResultadoPosiciones {
  const saldos = new Map<string, Decimal>();
  const seguidos = new Set<string>(); // activo y cuenta que ya tienen un SALDO
  const clave = (simbolo: string, cuenta = "") => `${simbolo}\u0000${cuenta}`;

  const conFecha = movimientos.map((m) => ({ ...m, fecha: m.fecha ?? new Date(0) }));
  for (const m of ordenarParaReproducir(conFecha)) {
    if (m.tipo === "SALDO") {
      const k = clave(m.simbolo, m.cuenta);
      saldos.set(k, new Decimal(m.cantidad));
      seguidos.add(k);
      continue;
    }
    for (const e of efectosDe(m, (s, c) => seguidos.has(clave(s, c)))) {
      const k = clave(e.simbolo, e.cuenta);
      saldos.set(k, (saldos.get(k) ?? new Decimal(0)).plus(e.cambio));
    }
  }

  const porActivo = new Map<string, Decimal>();
  const porCuenta = new Map<string, SaldoEnCuenta[]>();
  for (const k of [...saldos.keys()].sort()) {
    const [simbolo, cuenta] = k.split("\u0000") as [string, string];
    const cantidad = saldos.get(k)!;
    porActivo.set(simbolo, (porActivo.get(simbolo) ?? new Decimal(0)).plus(cantidad));
    if (cantidad.isPositive() && !cantidad.isZero()) porCuenta.set(simbolo, [...(porCuenta.get(simbolo) ?? []), { cuenta, cantidad }]);
  }

  const posiciones: Posicion[] = [];
  const saldosNegativos: string[] = [];
  for (const simbolo of [...porActivo.keys()].sort()) {
    const cantidad = porActivo.get(simbolo)!;
    if (cantidad.isPositive() && !cantidad.isZero()) posiciones.push({ simbolo, cantidad });
    // Negativo = hay una venta cuya compra no está en los exports. Cuenta como 0 y se informa.
    else if (cantidad.isNegative() && !cantidad.isZero()) saldosNegativos.push(simbolo);
  }
  return { posiciones, saldosNegativos, porCuenta };
}
