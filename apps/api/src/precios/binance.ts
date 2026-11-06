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
