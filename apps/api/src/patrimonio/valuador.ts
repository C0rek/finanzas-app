// Valuador: combina posiciones y precios en la respuesta del endpoint.
// Función pura. Los montos salen como texto para no perder precisión en JSON.
import { Decimal } from "../decimal.js";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import type { Posicion } from "./motor-posiciones.js";

export type RespuestaPatrimonio = {
  totalUsd: string;
  calculadoEn: string;
  parcial: true;
  activos: {
    simbolo: string;
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
): RespuestaPatrimonio {
  const activoDe = new Map(activos.map((a) => [a.simbolo, a]));
  const respuesta: RespuestaPatrimonio = {
    totalUsd: "0.00",
    calculadoEn: ahora.toISOString(),
    parcial: true,
    activos: [],
    avisos: { desactualizados: [], sinValorizar: [], saldosNegativos },
  };

  // El total se acumula sin redondear: solo se redondea al mostrar.
  let total = new Decimal(0);
  for (const { simbolo, cantidad } of posiciones) {
    const activo = activoDe.get(simbolo);
    const precio = precios.get(simbolo);
    if (!activo?.fuentePrecio || !precio) {
      respuesta.avisos.sinValorizar.push(simbolo);
      continue;
    }

    const valor = valorEnUsd(cantidad, activo.ratio, precio.precioUsd);
    total = total.plus(valor);

    const precioDel = precio.del.toISOString();
    respuesta.activos.push({
      simbolo,
      cantidad: cantidad.toFixed(),
      precioUsd: precio.precioUsd,
      valorUsd: valor.toFixed(2),
      origenPrecio: precio.origen,
      precioDel,
    });
    if (precio.desactualizado) respuesta.avisos.desactualizados.push({ simbolo, precioDel });
  }

  respuesta.totalUsd = total.toFixed(2);
  return respuesta;
}
