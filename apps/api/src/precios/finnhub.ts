// Precios de bolsa desde Finnhub (necesita FINNHUB_API_KEY).
import { esPrecioValido, TIMEOUT_PROVEEDOR_MS, type PrecioObtenido, type ProveedorPrecios } from "./proveedor-precios.js";

const URL_COTIZACION = "https://finnhub.io/api/v1/quote";

export class ProveedorFinnhub implements ProveedorPrecios {
  constructor(private readonly clave: string | undefined) {}

  async obtener(simbolos: string[]): Promise<Map<string, PrecioObtenido>> {
    const precios = new Map<string, PrecioObtenido>();
    if (simbolos.length === 0) return precios;
    if (!this.clave) throw new Error("Falta FINNHUB_API_KEY en apps/api/.env");

    // Finnhub se consulta de a un símbolo. Si uno falla, los demás se aprovechan igual.
    const resultados = await Promise.allSettled(simbolos.map((s) => this.cotizar(s)));
    resultados.forEach((resultado, i) => {
      if (resultado.status === "fulfilled" && resultado.value) precios.set(simbolos[i]!, resultado.value);
    });
    if (resultados.every((r) => r.status === "rejected")) throw new Error("Finnhub no respondió");
    return precios;
  }

  private async cotizar(simbolo: string): Promise<PrecioObtenido | null> {
    const url = `${URL_COTIZACION}?symbol=${encodeURIComponent(simbolo)}&token=${encodeURIComponent(this.clave!)}`;
    const respuesta = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_PROVEEDOR_MS) });
    // El mensaje no incluye la URL, porque lleva la clave.
    if (!respuesta.ok) throw new Error(`Finnhub respondió ${respuesta.status}`);
    const { c, t } = (await respuesta.json()) as { c?: unknown; t?: unknown };

    // Finnhub manda el precio como número JSON. Lo pasamos a texto acá mismo y nunca
    // lo usamos como `number`. Con un símbolo desconocido responde c = 0: eso no es un precio.
    const precioUsd = typeof c === "number" ? String(c) : null;
    if (!esPrecioValido(precioUsd) || typeof t !== "number") return null;
    // `t` es la hora de la cotización: con el mercado cerrado, la del último cierre.
    return { precioUsd, del: new Date(t * 1000) };
  }
}
