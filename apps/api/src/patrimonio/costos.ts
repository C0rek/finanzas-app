// Costo promedio ponderado: cuánto te costó, en USD, cada unidad que todavía tenés.
// Función pura. Devuelve null cuando el costo no se puede saber: nunca lo inventa.
import { Decimal } from "../decimal.js";

export type MovimientoCosto = {
  simbolo: string;
  tipo: string;
  cantidad: string;
  totalUsd: string | null;
  fecha: Date;
  // Solo para TRANSFER: de dónde sale, a dónde llega y cuánto se perdió en el camino.
  cuenta?: string;
  cuentaDestino?: string | null;
  comision?: string | null;
  simboloComision?: string | null;
};

// Cuenta de lo que viene de afuera o se va afuera (ver motor-posiciones.ts). Se repite para no importar en círculo.
const EXTERNO = "EXTERNO";

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
  const promedios = new Map<string, Decimal | null>();
  for (const [simbolo, { cantidad, costo }] of reproducir(movimientos)) {
    promedios.set(simbolo, costo === null || cantidad.isZero() ? null : costo.dividedBy(cantidad));
  }
  return promedios;
}

/**
 * Resultado realizado en USD por activo: lo cobrado en cada venta menos lo que costaron,
 * a precio promedio, las unidades vendidas. null = no se puede saber (una venta sin valor
 * en USD, un costo desconocido o una venta de compras que faltan en los exports).
 */
export function calcularResultadoRealizado(movimientos: MovimientoCosto[]): Map<string, Decimal | null> {
  const realizados = new Map<string, Decimal | null>();
  for (const [simbolo, { realizado }] of reproducir(movimientos)) realizados.set(simbolo, realizado);
  return realizados;
}

type EstadoCosto = { cantidad: Decimal; costo: Decimal | null; realizado: Decimal | null };

// Recorre el historial una vez y deja, por activo, lo que tenés, cuánto costó y cuánto ya ganaste.
function reproducir(movimientos: MovimientoCosto[]): Map<string, EstadoCosto> {
  const estados = new Map<string, EstadoCosto>();

  for (const m of ordenarParaReproducir(movimientos)) {
    const { simbolo, tipo, cantidad, totalUsd } = m;
    const estado = estados.get(simbolo) ?? { cantidad: new Decimal(0), costo: new Decimal(0), realizado: new Decimal(0) };
    estados.set(simbolo, estado);
    const unidades = new Decimal(cantidad);

    const sacar = (u: Decimal, conCosto: boolean) => {
      // Saca unidades sin cobrar nada. Con costo: se lleva su parte del costo (el promedio no cambia).
      // Sin costo: el costo queda en las unidades que siguen (el promedio sube, como una comisión).
      if (u.greaterThanOrEqualTo(estado.cantidad)) {
        estado.cantidad = new Decimal(0);
        estado.costo = new Decimal(0);
        return;
      }
      const queda = estado.cantidad.minus(u);
      if (conCosto) estado.costo = estado.costo === null ? null : estado.costo.times(queda).dividedBy(estado.cantidad);
      estado.cantidad = queda;
    };

    if (m.tipo === "TRANSFER") {
      // Entre cuentas propias el total no cambia; solo se pierde la comisión del camino.
      // Desde afuera entra sin costo; hacia afuera sale con su parte del costo.
      const perdida = m.comision && m.simboloComision === simbolo ? new Decimal(m.comision) : new Decimal(0);
      if (m.cuenta === EXTERNO) estado.cantidad = estado.cantidad.plus(unidades);
      else if (m.cuentaDestino === EXTERNO) sacar(unidades.plus(perdida), true);
      else sacar(perdida, false);
      continue;
    }
    if (m.tipo === "PNL_FUTUROS") {
      // Ganancia en COIN-M: unidades a costo 0, como el cashback. Pérdida: se van unidades con su costo.
      if (unidades.isPositive()) estado.cantidad = estado.cantidad.plus(unidades);
      else sacar(unidades.abs(), true);
      continue;
    }

    if (tipo === "COMPRA") {
      // Una compra en pesos sin su valor en USD vuelve desconocido el costo de la posición.
      estado.costo = estado.costo === null || totalUsd === null ? null : estado.costo.plus(totalUsd);
      estado.cantidad = estado.cantidad.plus(unidades);
    } else if (tipo === "AJUSTE") {
      // Suma unidades sin costo: un cambio de ratio reparte el mismo costo entre más CEDEARs.
      estado.cantidad = estado.cantidad.plus(unidades);
    } else if (tipo === "VENTA") {
      // Lo que costaron las unidades vendidas, a precio promedio. Si se vende más de lo que
      // figura, faltan compras: el costo de lo vendido no se conoce.
      const costoVendido =
        estado.costo === null || unidades.greaterThan(estado.cantidad)
          ? null
          : estado.costo.times(unidades).dividedBy(estado.cantidad);
      // Una vez desconocido, queda desconocido: no se suma sobre una base incompleta.
      estado.realizado =
        estado.realizado === null || costoVendido === null || totalUsd === null
          ? null
          : estado.realizado.plus(totalUsd).minus(costoVendido);

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
  return estados;
}
