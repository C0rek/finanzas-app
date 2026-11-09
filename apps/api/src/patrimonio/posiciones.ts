// Tabla de posiciones: valor actual, precio promedio y resultado no realizado por activo.
import { Decimal } from "../decimal.js";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import { nombresDeCuentas } from "./exposicion-btc.js";
import type { Posicion } from "./motor-posiciones.js";
import { grupoDe, valorEnUsd, type RespuestaPatrimonio } from "./valuador.js";

const CATEGORIAS: Record<string, string> = {
  CRIPTO: "Cripto",
  STABLECOIN: "Stables",
  CEDEAR: "CEDEAR",
  ACCION_TOKENIZADA: "Tokenizada",
  FIAT: "Fiat",
  BIEN: "Bien",
  FONDO: "Fondo",
  BONO: "Bono",
  ACCION: "Acción",
};

export type FilaPosicion = {
  activo: string;
  cantidad: string;
  ubicacion: string;
  categoria: string;
  precioUsd: string | null; // precio de mercado por unidad (en un CEDEAR, del subyacente)
  precioPromedioUsd: string | null;
  valorUsd: string | null;
  noRealizadaUsd: string | null;
  noRealizadaPct: string | null; // resultado sobre lo que costó lo que tenés hoy
};

export type RespuestaPosiciones = {
  calculadoEn: string;
  movimientosHasta: string | null; // fecha del último movimiento cargado
  parcial: true;
  posiciones: FilaPosicion[];
  // costoUsd: lo que costó lo que tenés hoy, solo de las posiciones con precio promedio conocido.
  total: { valorUsd: string; noRealizadaUsd: string; costoUsd: string };
  avisos: {
    desactualizados: { simbolo: string; precioDel: string }[];
    sinValorizar: string[];
    sinPrecioPromedio: string[];
    saldosNegativos: string[];
  };
};

type Entrada = {
  valuacion: RespuestaPatrimonio;
  posiciones: Posicion[];
  activos: ActivoValuable[];
  precios: Map<string, PrecioVigente>;
  tipos: Map<string, string>;
  grupos: Map<string, string>; // la liquidez entra como una fila más; el colchón, no
  ubicaciones: Map<string, string[]>;
  promedios: Map<string, Decimal | null>;
  movimientosHasta: Date | null;
};

// Un resultado que redondea a 0 no es una pérdida: "-0.00" se pintaría como tal.
function aDosDecimales(valor: Decimal): string {
  const texto = valor.toFixed(2);
  return texto === "-0.00" ? "0.00" : texto;
}

export function armarPosiciones({ valuacion, posiciones, activos, precios, tipos, grupos, ubicaciones, promedios, movimientosHasta }: Entrada): RespuestaPosiciones {
  const activoDe = new Map(activos.map((a) => [a.simbolo, a]));
  const sinPrecioPromedio: string[] = [];
  let noRealizadaTotal = new Decimal(0);
  let costoTotal = new Decimal(0);

  // El colchón de ahorro suma al patrimonio, pero no es cartera de inversión.
  const enTabla = posiciones.filter((p) => grupoDe(grupos, p.simbolo) !== "COLCHON");
  const filas = enTabla.map(({ simbolo, cantidad }) => {
    const activo = activoDe.get(simbolo);
    const ratio = activo?.ratio ?? null;
    const precio = activo?.fuentePrecio ? precios.get(simbolo) : undefined;
    const esLiquidez = grupoDe(grupos, simbolo) === "LIQUIDEZ";
    // La liquidez no tiene resultado: un USDT vale un USDT. No es un costo desconocido.
    const promedio = esLiquidez ? null : (promedios.get(simbolo) ?? null);
    if (promedio === null && !esLiquidez) sinPrecioPromedio.push(simbolo);

    const valor = precio ? valorEnUsd(cantidad, ratio, precio.precioUsd) : null;
    const costo = promedio ? promedio.times(cantidad) : null;
    const noRealizada = valor && costo ? valor.minus(costo) : null;
    if (noRealizada && costo) {
      noRealizadaTotal = noRealizadaTotal.plus(noRealizada);
      costoTotal = costoTotal.plus(costo);
    }

    return {
      valor,
      fila: {
        activo: simbolo,
        cantidad: cantidad.toFixed(),
        ubicacion: nombresDeCuentas(ubicaciones.get(simbolo)),
        categoria: esLiquidez ? "Liquidez" : (CATEGORIAS[tipos.get(simbolo) ?? ""] ?? "Otro"),
        // Un CEDEAR se compara contra el precio del subyacente: el promedio va por esa misma unidad.
        precioUsd: precio ? new Decimal(precio.precioUsd).toFixed() : null,
        precioPromedioUsd: promedio ? promedio.times(ratio ?? 1).toFixed(8) : null,
        valorUsd: valor ? valor.toFixed(2) : null,
        noRealizadaUsd: noRealizada ? aDosDecimales(noRealizada) : null,
        noRealizadaPct:
          noRealizada && costo && !costo.isZero() ? aDosDecimales(noRealizada.dividedBy(costo).times(100)) : null,
      } satisfies FilaPosicion,
    };
  });

  filas.sort((a, b) => {
    if (!a.valor) return b.valor ? 1 : 0;
    if (!b.valor) return -1;
    return b.valor.comparedTo(a.valor);
  });

  return {
    calculadoEn: valuacion.calculadoEn,
    movimientosHasta: movimientosHasta?.toISOString() ?? null,
    parcial: true,
    posiciones: filas.map((f) => f.fila),
    // Lo invertido más la liquidez: el colchón suma al patrimonio, no a esta tabla.
    total: {
      valorUsd: valuacion.desglose.inversionUsd,
      noRealizadaUsd: aDosDecimales(noRealizadaTotal),
      costoUsd: costoTotal.toFixed(2),
    },
    avisos: {
      desactualizados: valuacion.avisos.desactualizados,
      sinValorizar: valuacion.avisos.sinValorizar,
      sinPrecioPromedio,
      saldosNegativos: valuacion.avisos.saldosNegativos,
    },
  };
}
