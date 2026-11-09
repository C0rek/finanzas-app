// Costo promedio ponderado: cuánto te costó, en USD, cada unidad que todavía tenés.
// Función pura. Devuelve null cuando el costo no se puede saber: nunca lo inventa.
import { Decimal } from "../decimal.js";

export type MovimientoCosto = { simbolo: string; tipo: string; cantidad: string; totalUsd: string | null; fecha: Date };

/**
 * Orden para reproducir el historial: por fecha y, dentro de la misma fecha, compras
 * antes que ventas. Algunos exports traen solo el día, sin hora: si la venta se
 * procesara primero, parecería que vendiste algo que todavía no tenías.
 */
export function ordenarParaReproducir<T extends { tipo: string; fecha: Date }>(movimientos: T[]): T[] {
  const prioridad = (tipo: string) => (tipo === "VENTA" ? 1 : 0);
  return [...movimientos].sort((a, b) => a.fecha.getTime() - b.fecha.getTime() || prioridad(a.tipo) - prioridad(b.tipo));
}

/** Precio promedio en USD por unidad del activo tal como se guarda (un CEDEAR, no su subyacente). */
export function calcularPreciosPromedio(movimientos: MovimientoCosto[]): Map<string, Decimal | null> {
  const estados = new Map<string, { cantidad: Decimal; costo: Decimal | null }>();

  for (const { simbolo, tipo, cantidad, totalUsd } of ordenarParaReproducir(movimientos)) {
    const estado = estados.get(simbolo) ?? { cantidad: new Decimal(0), costo: new Decimal(0) };
    estados.set(simbolo, estado);
    const unidades = new Decimal(cantidad);

    if (tipo === "COMPRA") {
      // Una compra en pesos sin su valor en USD vuelve desconocido el costo de la posición.
      estado.costo = estado.costo === null || totalUsd === null ? null : estado.costo.plus(totalUsd);
      estado.cantidad = estado.cantidad.plus(unidades);
    } else if (tipo === "AJUSTE") {
      // Suma unidades sin costo: un cambio de ratio reparte el mismo costo entre más CEDEARs.
      estado.cantidad = estado.cantidad.plus(unidades);
    } else if (tipo === "VENTA") {
      if (unidades.greaterThanOrEqualTo(estado.cantidad)) {
        // Sin saldo no queda costo. También cubre ventas de compras que faltan en los exports.
        estado.cantidad = new Decimal(0);
        estado.costo = new Decimal(0);
      } else {
        // Vender no cambia el promedio: el costo baja en la misma proporción que la cantidad.
        const queda = estado.cantidad.minus(unidades);
        estado.costo = estado.costo === null ? null : estado.costo.times(queda).dividedBy(estado.cantidad);
        estado.cantidad = queda;
      }
    }
  }

  const promedios = new Map<string, Decimal | null>();
  for (const [simbolo, { cantidad, costo }] of estados) {
    promedios.set(simbolo, costo === null || cantidad.isZero() ? null : costo.dividedBy(cantidad));
  }
  return promedios;
}
