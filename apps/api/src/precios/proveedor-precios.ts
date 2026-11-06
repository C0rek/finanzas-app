// Contrato de un proveedor de precios. El resto del sistema solo conoce esta
// interfaz, así se puede cambiar de proveedor sin tocar el cálculo.
import { Decimal } from "decimal.js";

export const TIMEOUT_PROVEEDOR_MS = 5_000;

export type PrecioObtenido = { precioUsd: string; del: Date };

export interface ProveedorPrecios {
  /** Símbolo sin precio válido = ausente en el Map. Si se cae por completo, lanza. */
  obtener(simbolos: string[]): Promise<Map<string, PrecioObtenido>>;
}

export type ActivoValuable = {
  id: number;
  simbolo: string;
  ratio: string | null;
  fuentePrecio: "CRIPTO" | "BOLSA" | "MANUAL" | null;
  simboloPrecio: string | null;
};

export type PrecioVigente = { precioUsd: string; del: Date; origen: "API" | "MANUAL"; desactualizado: boolean };

/** Un precio 0 o ilegible es una falla del proveedor: nunca debe valorizar un activo en 0. */
export function esPrecioValido(valor: unknown): valor is string {
  if (typeof valor !== "string" || valor === "") return false;
  try {
    const d = new Decimal(valor);
    return d.isFinite() && d.greaterThan(0);
  } catch {
    return false;
  }
}
