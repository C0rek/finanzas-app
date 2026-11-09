// Valuador: combina posiciones y precios en la respuesta del endpoint.
// Función pura. Los montos salen como texto para no perder precisión en JSON.
import { Decimal } from "../decimal.js";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import type { Posicion } from "./motor-posiciones.js";

export type Grupo = "POSICION" | "LIQUIDEZ" | "COLCHON";

export type RespuestaPatrimonio = {
  totalUsd: string;
  calculadoEn: string;
  parcial: true;
  // Cómo se reparte el total. La cartera de inversión es la tabla de posiciones: incluye la liquidez
  // para operar (liquidezUsd es la parte de ella que está en USDT). El colchón de ahorro va aparte.
  desglose: { inversionUsd: string; liquidezUsd: string; colchonUsd: string };
  activos: {
    simbolo: string;
    grupo: Grupo;
    cantidad: string;
    precioUsd: string;
    valorUsd: string;
    origenPrecio: "API" | "MANUAL";
    precioDel: string;
  }[];
  avisos: {
    desactualizados: { simbolo: string; precioDel: string }[];
    sinValorizar: string[];
    saldosNegativos: string[];
  };
};

/** Un CEDEAR representa una fracción del subyacente: cantidad ÷ ratio. */
export function valorEnUsd(cantidad: Decimal, ratio: string | null, precioUsd: string): Decimal {
  const equivalente = ratio ? cantidad.dividedBy(ratio) : cantidad;
  return equivalente.times(precioUsd);
}

export function valuar(
  posiciones: Posicion[],
  saldosNegativos: string[],
  activos: ActivoValuable[],
  precios: Map<string, PrecioVigente>,
  ahora: Date,
  // Grupo de cada activo según el catálogo. El que no figura es una posición.
  grupos: Map<string, string> = new Map(),
): RespuestaPatrimonio {
  const activoDe = new Map(activos.map((a) => [a.simbolo, a]));
  const respuesta: RespuestaPatrimonio = {
    totalUsd: "0.00",
    calculadoEn: ahora.toISOString(),
    parcial: true,
    desglose: { inversionUsd: "0.00", liquidezUsd: "0.00", colchonUsd: "0.00" },
    activos: [],
    avisos: { desactualizados: [], sinValorizar: [], saldosNegativos },
  };

  // Los totales se acumulan sin redondear: solo se redondea al mostrar.
  let total = new Decimal(0);
  const porGrupo: Record<Grupo, Decimal> = { POSICION: new Decimal(0), LIQUIDEZ: new Decimal(0), COLCHON: new Decimal(0) };
  for (const { simbolo, cantidad } of posiciones) {
    const activo = activoDe.get(simbolo);
    const precio = precios.get(simbolo);
    if (!activo?.fuentePrecio || !precio) {
      respuesta.avisos.sinValorizar.push(simbolo);
      continue;
    }

    const valor = valorEnUsd(cantidad, activo.ratio, precio.precioUsd);
    const grupo = grupoDe(grupos, simbolo);
    total = total.plus(valor);
    porGrupo[grupo] = porGrupo[grupo].plus(valor);

    const precioDel = precio.del.toISOString();
    respuesta.activos.push({
      simbolo,
      grupo,
      cantidad: cantidad.toFixed(),
      precioUsd: precio.precioUsd,
      valorUsd: valor.toFixed(2),
      origenPrecio: precio.origen,
      precioDel,
    });
    if (precio.desactualizado) respuesta.avisos.desactualizados.push({ simbolo, precioDel });
  }

  respuesta.totalUsd = total.toFixed(2);
  respuesta.desglose = {
    inversionUsd: porGrupo.POSICION.plus(porGrupo.LIQUIDEZ).toFixed(2),
    liquidezUsd: porGrupo.LIQUIDEZ.toFixed(2),
    colchonUsd: porGrupo.COLCHON.toFixed(2),
  };
  return respuesta;
}

export function grupoDe(grupos: Map<string, string>, simbolo: string): Grupo {
  const grupo = grupos.get(simbolo);
  return grupo === "LIQUIDEZ" || grupo === "COLCHON" ? grupo : "POSICION";
}
