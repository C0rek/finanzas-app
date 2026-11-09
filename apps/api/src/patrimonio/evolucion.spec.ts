import { describe, expect, it } from "vitest";
import type { ActivoValuable } from "../precios/proveedor-precios.js";
import { calcularEvolucion, ultimosMeses } from "./evolucion.js";

// ⚠️ Datos inventados para los tests.
const AHORA = new Date("2026-03-15T12:00:00.000Z");
const ACTIVOS: ActivoValuable[] = [
  { id: 1, simbolo: "CRI", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "CRIUSDT" },
  { id: 2, simbolo: "ACC", ratio: "10", fuentePrecio: "BOLSA", simboloPrecio: "ACC" },
  { id: 3, simbolo: "LIQ", ratio: null, fuentePrecio: "MANUAL", simboloPrecio: null },
];
const compra = (simbolo: string, fecha: string, cantidad: string, totalUsd: string) => ({
  simbolo, tipo: "COMPRA", cantidad, totalUsd, fecha: new Date(fecha),
});

function evolucion(movimientos: ReturnType<typeof compra>[], cierres = new Map<string, Map<string, string>>()) {
  return calcularEvolucion({
    movimientos, activos: ACTIVOS, cierres, manuales: new Map([["LIQ", "1"]]),
    totalActualUsd: "999.00", ahora: AHORA, cantidadMeses: 3,
  });
}

describe("ultimosMeses", () => {
  it("devuelve los últimos meses, del más viejo al actual, cruzando el año", () => {
    expect(ultimosMeses(new Date("2026-02-10T00:00:00Z"), 3)).toEqual(["2025-12", "2026-01", "2026-02"]);
  });
});

describe("calcularEvolucion", () => {
  it("el mes actual es el patrimonio de ahora", () => {
    const r = evolucion([]);
    expect(r.meses.at(-1)).toEqual({ mes: "2026-03", valorUsd: "999.00", actual: true });
  });

  it("valúa las cripto al cierre de cada mes", () => {
    const cierres = new Map([["CRI", new Map([["2026-01", "100"], ["2026-02", "150"]])]]);
    const r = evolucion([compra("CRI", "2026-01-10T00:00:00Z", "2", "180")], cierres);
    expect(r.meses.map((m) => m.valorUsd)).toEqual(["200.00", "300.00", "999.00"]);
    expect(r.aCosto).toEqual([]);
  });

  it("sin precio histórico usa el costo y lo informa", () => {
    const r = evolucion([compra("ACC", "2026-02-01T00:00:00Z", "10", "500")]);
    expect(r.meses.map((m) => m.valorUsd)).toEqual(["0.00", "500.00", "999.00"]);
    expect(r.aCosto).toEqual(["ACC"]);
  });

  it("lo manual se valúa a su valor cargado", () => {
    const r = evolucion([{ simbolo: "LIQ", tipo: "AJUSTE", cantidad: "50", totalUsd: null as unknown as string, fecha: new Date("2026-01-05T00:00:00Z") }]);
    expect(r.meses[0]!.valorUsd).toBe("50.00");
  });

  it("un movimiento del primer día del mes siguiente no cuenta para el cierre", () => {
    const r = evolucion([compra("ACC", "2026-02-01T00:00:00Z", "10", "500")]);
    expect(r.meses[0]!.valorUsd).toBe("0.00");
  });
});
