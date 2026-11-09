// Precios cripto desde la API pública de Binance (no necesita clave).
// Cotiza en USDT, que tomamos como equivalente a USD: puede haber una diferencia mínima.
import { esPrecioValido, TIMEOUT_PROVEEDOR_MS, type PrecioObtenido, type ProveedorPrecios } from "./proveedor-precios.js";

const URL_PRECIOS = "https://api.binance.com/api/v3/ticker/price";

export class ProveedorBinance implements ProveedorPrecios {
  async obtener(simbolos: string[]): Promise<Map<string, PrecioObtenido>> {
    const precios = new Map<string, PrecioObtenido>();
    if (simbolos.length === 0) return precios;

    // Pedimos la lista completa y filtramos: el parámetro `symbols` hace fallar toda
    // la consulta si un solo símbolo no existe (por ejemplo, un activo deslistado).
    const respuesta = await fetch(URL_PRECIOS, { signal: AbortSignal.timeout(TIMEOUT_PROVEEDOR_MS) });
    if (!respuesta.ok) throw new Error(`Binance respondió ${respuesta.status}`);
    const lista: unknown = await respuesta.json();
    if (!Array.isArray(lista)) throw new Error("Binance devolvió un formato inesperado");

    const pedidos = new Set(simbolos);
    const ahora = new Date();
    for (const fila of lista as { symbol?: unknown; price?: unknown }[]) {
      if (typeof fila.symbol === "string" && pedidos.has(fila.symbol) && esPrecioValido(fila.price)) {
        precios.set(fila.symbol, { precioUsd: fila.price, del: ahora });
      }
    }
    return precios;
  }
}

const URL_VELAS = "https://api.binance.com/api/v3/klines";

/** Precio de cierre de cada mes (UTC), por mes "AAAA-MM". Un símbolo inexistente devuelve un Map vacío. */
export type CierresMensuales = (simboloPrecio: string, meses: number) => Promise<Map<string, string>>;

export const cierresMensualesBinance: CierresMensuales = async (simboloPrecio, meses) => {
  const url = `${URL_VELAS}?symbol=${encodeURIComponent(simboloPrecio)}&interval=1M&limit=${meses}`;
  const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_PROVEEDOR_MS) });
  // 400 = símbolo desconocido (por ejemplo, deslistado): no es una caída del proveedor.
  if (respuesta.status === 400) return new Map();
  if (!respuesta.ok) throw new Error(`Binance respondió ${respuesta.status}`);
  const velas: unknown = await respuesta.json();
  if (!Array.isArray(velas)) throw new Error("Binance devolvió un formato inesperado");

  // Cada vela es [apertura (ms), open, high, low, close, ...]. El close es texto: no pasa por number.
  const cierres = new Map<string, string>();
  for (const vela of velas as unknown[][]) {
    const [apertura, , , , cierre] = vela;
    if (typeof apertura === "number" && esPrecioValido(cierre)) {
      cierres.set(new Date(apertura).toISOString().slice(0, 7), cierre);
    }
  }
  return cierres;
};
