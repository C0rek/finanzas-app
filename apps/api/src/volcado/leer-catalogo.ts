// Lee y valida el catálogo de activos. El catálogo real vive fuera del repo,
// porque la lista de activos ya dice qué tenés.
import { Decimal } from "decimal.js";
import { parse } from "csv-parse/sync";
import { FuentePrecio, TipoActivo } from "../generated/prisma/client.js";

export type EntradaCatalogo = {
  simbolo: string;
  nombre: string;
  tipo: TipoActivo;
  ratio: string | null;
  fuentePrecio: FuentePrecio | null;
  simboloPrecio: string | null;
  unificaEn: string | null;
  valorManual: { precioUsd: string; fecha: Date } | null;
};

type FilaCatalogo = Record<
  | "simbolo" | "nombre" | "tipo" | "ratio" | "fuente_precio" | "simbolo_precio"
  | "unifica_en" | "valor_manual_usd" | "valor_manual_fecha",
  string
>;

export function leerCatalogo(texto: string): EntradaCatalogo[] {
  const filas: FilaCatalogo[] = parse(texto, { bom: true, columns: true, skip_empty_lines: true, trim: true });
  const errores: string[] = [];
  const entradas: EntradaCatalogo[] = [];

  for (const f of filas) {
    const problema = (detalle: string) => errores.push(`Catálogo, ${f.simbolo}: ${detalle}`);

    if (!Object.values(TipoActivo).includes(f.tipo as TipoActivo)) problema(`tipo inválido "${f.tipo}"`);
    if (f.fuente_precio && !Object.values(FuentePrecio).includes(f.fuente_precio as FuentePrecio)) {
      problema(`fuente_precio inválida "${f.fuente_precio}"`);
    }
    if (f.tipo === TipoActivo.CEDEAR && !esPositivo(f.ratio)) problema("un CEDEAR necesita un ratio mayor a 0");
    if (f.ratio && !esPositivo(f.ratio)) problema(`ratio inválido "${f.ratio}"`);
    if ((f.fuente_precio === "CRIPTO" || f.fuente_precio === "BOLSA") && !f.simbolo_precio) {
      problema("falta simbolo_precio");
    }
    if (f.fuente_precio === "MANUAL" && (!esPositivo(f.valor_manual_usd) || !f.valor_manual_fecha)) {
      problema("falta el valor manual o su fecha");
    }
    const fechaManual = f.valor_manual_fecha ? new Date(`${f.valor_manual_fecha.slice(0, 10)}T00:00:00Z`) : null;
    if (fechaManual && Number.isNaN(fechaManual.getTime())) problema(`fecha inválida "${f.valor_manual_fecha}"`);

    entradas.push({
      simbolo: f.simbolo,
      nombre: f.nombre,
      tipo: f.tipo as TipoActivo,
      ratio: f.ratio || null,
      fuentePrecio: (f.fuente_precio as FuentePrecio) || null,
      simboloPrecio: f.simbolo_precio || null,
      unificaEn: f.unifica_en || null,
      valorManual: f.fuente_precio === "MANUAL" && fechaManual ? { precioUsd: f.valor_manual_usd, fecha: fechaManual } : null,
    });
  }

  const principales = new Set(entradas.filter((e) => !e.unificaEn).map((e) => e.simbolo));
  for (const e of entradas) {
    if (e.unificaEn && !principales.has(e.unificaEn)) {
      errores.push(`Catálogo, ${e.simbolo}: unifica_en apunta a "${e.unificaEn}", que no es un símbolo principal`);
    }
  }

  if (errores.length > 0) throw new Error(errores.join("\n"));
  return entradas;
}

function esPositivo(valor: string): boolean {
  try {
    return valor !== "" && new Decimal(valor).greaterThan(0);
  } catch {
    return false;
  }
}
