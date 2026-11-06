// Exposición a Bitcoin: qué parte de la cartera depende del precio de BTC.
// Es una función pura, como el motor y el valuador.
import { Decimal } from "../decimal.js";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import { calcularPosiciones, type MovimientoPosicion, type Posicion } from "./motor-posiciones.js";
import { valorEnUsd, type RespuestaPatrimonio } from "./valuador.js";

export const SIMBOLO_BTC = "BTC";
// ETF de Bitcoin. Su valor se mueve con BTC, así que cuenta como exposición.
const SIMBOLO_ETF_BTC = "IBIT";
const NO_CONTEMPLADO = "No contemplado";
const SIN_SALDO = "Sin saldo";
const ACTIVOS_DEL_RESTO_A_NOMBRAR = 3;

export type ParteExposicion = { etiqueta: string; porcentaje: string; cantidadBtc: string; ubicacion: string };

export type RespuestaExposicionBtc = {
  calculadoEn: string;
  parcial: true;
  carteraUsd: string;
  precioBtcUsd: string | null;
  porcentaje: string;
  cantidadBtc: string;
  valorUsd: string;
  partes: ParteExposicion[];
  resto: { porcentaje: string; detalle: string };
  avisos: { desactualizados: { simbolo: string; precioDel: string }[]; sinValorizar: string[] };
};

type Entrada = {
  valuacion: RespuestaPatrimonio;
  posiciones: Posicion[];
  activos: ActivoValuable[];
  precios: Map<string, PrecioVigente>;
  ubicaciones: Map<string, string[]>;
};

export function calcularExposicionBtc({ valuacion, posiciones, activos, precios, ubicaciones }: Entrada): RespuestaExposicionBtc {
  const cartera = new Decimal(valuacion.totalUsd);
  const precioBtc = precios.get(SIMBOLO_BTC);
  const cantidadDe = (simbolo: string) => posiciones.find((p) => p.simbolo === simbolo)?.cantidad;

  const spotBtc = cantidadDe(SIMBOLO_BTC) ?? new Decimal(0);
  const valorSpot = precioBtc ? spotBtc.times(precioBtc.precioUsd) : new Decimal(0);

  // El IBIT se expresa en BTC según su valor: USD del ETF ÷ precio de BTC.
  const cantidadEtf = cantidadDe(SIMBOLO_ETF_BTC);
  const precioEtf = precios.get(SIMBOLO_ETF_BTC);
  const activoEtf = activos.find((a) => a.simbolo === SIMBOLO_ETF_BTC);
  const valorEtf = cantidadEtf && precioEtf && activoEtf
    ? valorEnUsd(cantidadEtf, activoEtf.ratio, precioEtf.precioUsd)
    : new Decimal(0);
  const etfEnBtc = precioBtc ? valorEtf.dividedBy(precioBtc.precioUsd) : new Decimal(0);

  const valorBtc = valorSpot.plus(valorEtf);
  const porcentajeDe = (valor: Decimal) => (cartera.isZero() ? new Decimal(0) : valor.dividedBy(cartera).times(100));
  const porcentajeBtc = porcentajeDe(valorBtc);

  const noContemplada = (etiqueta: string): ParteExposicion => ({
    etiqueta, porcentaje: "0.00", cantidadBtc: new Decimal(0).toFixed(8), ubicacion: NO_CONTEMPLADO,
  });
  const parte = (etiqueta: string, simbolo: string, valor: Decimal, cantidad: Decimal): ParteExposicion => ({
    etiqueta,
    porcentaje: porcentajeDe(valor).toFixed(2),
    cantidadBtc: cantidad.toFixed(8),
    ubicacion: nombresDeCuentas(ubicaciones.get(simbolo)),
  });

  const esBtc = (simbolo: string) => simbolo === SIMBOLO_BTC || simbolo === SIMBOLO_ETF_BTC;

  return {
    calculadoEn: valuacion.calculadoEn,
    parcial: true,
    carteraUsd: valuacion.totalUsd,
    precioBtcUsd: precioBtc?.precioUsd ?? null,
    porcentaje: porcentajeBtc.toFixed(2),
    cantidadBtc: spotBtc.plus(etfEnBtc).toFixed(8),
    valorUsd: valorBtc.toFixed(2),
    // Futuros y cold wallet todavía no tienen datos: se muestran en 0 y se aclara.
    partes: [
      parte("Spot", SIMBOLO_BTC, valorSpot, spotBtc),
      noContemplada("Futuros (margen)"),
      parte("IBIT", SIMBOLO_ETF_BTC, valorEtf, etfEnBtc),
      noContemplada("Cold wallet"),
    ],
    resto: {
      porcentaje: cartera.isZero() ? "0.00" : new Decimal(100).minus(porcentajeBtc).toFixed(2),
      detalle: detalleDelResto(valuacion.activos.filter((a) => !esBtc(a.simbolo))),
    },
    avisos: {
      desactualizados: valuacion.avisos.desactualizados.filter((a) => esBtc(a.simbolo)),
      sinValorizar: valuacion.avisos.sinValorizar.filter(esBtc),
    },
  };
}

/** En qué cuentas queda saldo de cada activo. */
export function ubicacionesPorActivo(movimientos: (MovimientoPosicion & { cuenta: string })[]): Map<string, string[]> {
  const ubicaciones = new Map<string, string[]>();
  for (const cuenta of [...new Set(movimientos.map((m) => m.cuenta))].sort()) {
    const { posiciones } = calcularPosiciones(movimientos.filter((m) => m.cuenta === cuenta));
    for (const { simbolo } of posiciones) {
      ubicaciones.set(simbolo, [...(ubicaciones.get(simbolo) ?? []), cuenta]);
    }
  }
  return ubicaciones;
}

function nombresDeCuentas(cuentas: string[] = []): string {
  if (cuentas.length === 0) return SIN_SALDO;
  return cuentas.map(nombreLegible).join(" · ");
}

// Las cuentas se guardan en mayúsculas ("BINANCE"). Las siglas cortas ("IOL") quedan igual.
function nombreLegible(cuenta: string): string {
  return cuenta.length <= 3 ? cuenta : `${cuenta[0]}${cuenta.slice(1).toLowerCase()}`;
}

function detalleDelResto(activos: RespuestaPatrimonio["activos"]): string {
  if (activos.length === 0) return "Sin otros activos";
  const ordenados = [...activos].sort((a, b) => new Decimal(b.valorUsd).comparedTo(a.valorUsd));
  const nombrados = ordenados.slice(0, ACTIVOS_DEL_RESTO_A_NOMBRAR).map((a) => a.simbolo).join(", ");
  const restantes = ordenados.length - ACTIVOS_DEL_RESTO_A_NOMBRAR;
  return restantes > 0 ? `${nombrados} y ${restantes} más` : nombrados;
}
