// Evolución del patrimonio: cuánto valía todo al cierre de cada mes. Función pura.
//
// No hay precios históricos de todo: las cripto se valúan al cierre del mes (Binance),
// lo manual (USDT, USDC, fondos) a su valor cargado, y el resto (acciones, CEDEARs) a lo
// que costó. El mes en curso es el patrimonio de ahora, con precios en vivo.
import { Decimal } from "../decimal.js";
import type { ActivoValuable } from "../precios/proveedor-precios.js";
import { calcularPreciosPromedio, type MovimientoCosto } from "./costos.js";
import { calcularPosiciones, type MovimientoPosicion } from "./motor-posiciones.js";

export type MesEvolucion = { mes: string; valorUsd: string; actual: boolean };

export type RespuestaEvolucion = {
  calculadoEn: string;
  parcial: true;
  meses: MesEvolucion[]; // del más viejo al más nuevo; mes = "AAAA-MM"
  aCosto: string[]; // activos que en algún mes cerrado se valuaron a costo
  sinValorizar: string[]; // ni precio ni costo: no suman en esos meses
};

type Entrada = {
  movimientos: (MovimientoPosicion & MovimientoCosto)[];
  activos: ActivoValuable[];
  cierres: Map<string, Map<string, string>>; // símbolo → mes → precio de cierre
  manuales: Map<string, string>; // símbolo → valor manual
  totalActualUsd: string;
  ahora: Date;
  cantidadMeses: number;
};

/** Los últimos `cantidad` meses (UTC), del más viejo al actual, como "AAAA-MM". */
export function ultimosMeses(ahora: Date, cantidad: number): string[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const d = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth() - (cantidad - 1 - i), 1));
    return d.toISOString().slice(0, 7);
  });
}

export function calcularEvolucion({ movimientos, activos, cierres, manuales, totalActualUsd, ahora, cantidadMeses }: Entrada): RespuestaEvolucion {
  const activoDe = new Map(activos.map((a) => [a.simbolo, a]));
  const aCosto = new Set<string>();
  const sinValorizar = new Set<string>();
  const meses = ultimosMeses(ahora, cantidadMeses);

  const resultado = meses.map((mes, i): MesEvolucion => {
    const esActual = i === meses.length - 1;
    if (esActual) return { mes, valorUsd: totalActualUsd, actual: true };

    // Todo lo que pasó antes del primer día del mes siguiente.
    const [anio, numero] = mes.split("-").map(Number) as [number, number];
    const fin = new Date(Date.UTC(anio, numero, 1));
    const hastaFin = movimientos.filter((m) => m.fecha < fin);
    const { posiciones } = calcularPosiciones(hastaFin);
    const promedios = calcularPreciosPromedio(hastaFin);

    let total = new Decimal(0);
    for (const { simbolo, cantidad } of posiciones) {
      const activo = activoDe.get(simbolo);
      const cierre = activo?.fuentePrecio === "CRIPTO" ? cierres.get(simbolo)?.get(mes) : undefined;
      const manual = activo?.fuentePrecio === "MANUAL" ? manuales.get(simbolo) : undefined;
      const promedio = promedios.get(simbolo) ?? null;

      if (cierre) total = total.plus(cantidad.times(cierre));
      else if (manual) total = total.plus(cantidad.times(manual));
      else if (promedio) {
        total = total.plus(promedio.times(cantidad));
        aCosto.add(simbolo);
      } else sinValorizar.add(simbolo);
    }
    return { mes, valorUsd: total.toFixed(2), actual: false };
  });

  return {
    calculadoEn: ahora.toISOString(),
    parcial: true,
    meses: resultado,
    aCosto: [...aCosto].sort(),
    sinValorizar: [...sinValorizar].sort(),
  };
}
