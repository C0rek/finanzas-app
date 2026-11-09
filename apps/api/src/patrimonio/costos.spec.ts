import { describe, expect, it } from "vitest";
import { calcularPreciosPromedio, calcularResultadoRealizado, type MovimientoCosto } from "./costos.js";

// ⚠️ Datos inventados para los tests.
let dia = 1;
const mov = (tipo: string, cantidad: string, totalUsd: string | null = null, simbolo = "X"): MovimientoCosto => ({
  simbolo, tipo, cantidad, totalUsd, fecha: new Date(Date.UTC(2026, 0, dia++)),
});
const promedio = (movimientos: MovimientoCosto[], simbolo = "X") => calcularPreciosPromedio(movimientos).get(simbolo);

describe("calcularPreciosPromedio", () => {
  it("promedia las compras ponderando por cantidad", () => {
    expect(promedio([mov("COMPRA", "1", "100"), mov("COMPRA", "3", "600")])!.toFixed(2)).toBe("175.00");
  });

  it("una venta no cambia el promedio de lo que queda", () => {
    expect(promedio([mov("COMPRA", "4", "400"), mov("VENTA", "1"), mov("COMPRA", "1", "200")])!.toFixed(2)).toBe("125.00");
  });

  it("al llegar a 0 reinicia el costo", () => {
    expect(promedio([mov("COMPRA", "1", "100"), mov("VENTA", "1"), mov("COMPRA", "1", "300")])!.toFixed(2)).toBe("300.00");
  });

  it("una compra sin valor en USD deja el promedio desconocido", () => {
    expect(promedio([mov("COMPRA", "1", "100"), mov("COMPRA", "1", null)])).toBeNull();
  });

  it("vender todo olvida las compras sin valor en USD", () => {
    expect(promedio([mov("COMPRA", "1", null), mov("VENTA", "1"), mov("COMPRA", "2", "100")])!.toFixed(2)).toBe("50.00");
  });

  it("un AJUSTE suma cantidad sin costo, como un cambio de ratio", () => {
    expect(promedio([mov("COMPRA", "1", "300"), mov("AJUSTE", "2")])!.toFixed(2)).toBe("100.00");
  });

  it("una venta sin compra previa no rompe el promedio de las siguientes", () => {
    expect(promedio([mov("VENTA", "1"), mov("COMPRA", "2", "100")])!.toFixed(2)).toBe("50.00");
  });

  it("sin saldo no hay promedio", () => {
    expect(promedio([mov("COMPRA", "1", "100"), mov("VENTA", "1")])).toBeNull();
  });

  it("el mismo día procesa las compras antes que las ventas", () => {
    const fecha = new Date("2026-02-01T00:00:00Z");
    const r = calcularPreciosPromedio([
      { simbolo: "X", tipo: "VENTA", cantidad: "1", totalUsd: null, fecha },
      { simbolo: "X", tipo: "COMPRA", cantidad: "2", totalUsd: "100", fecha },
    ]);
    expect(r.get("X")!.toFixed(2)).toBe("50.00");
  });

  it("separa por activo", () => {
    const r = calcularPreciosPromedio([mov("COMPRA", "1", "10", "A"), mov("COMPRA", "1", "20", "B")]);
    expect([r.get("A")!.toFixed(0), r.get("B")!.toFixed(0)]).toEqual(["10", "20"]);
  });
});

describe("calcularResultadoRealizado", () => {
  const realizado = (movimientos: MovimientoCosto[], simbolo = "X") =>
    calcularResultadoRealizado(movimientos).get(simbolo);

  it("sin ventas, el resultado realizado es 0", () => {
    expect(realizado([mov("COMPRA", "2", "200")])!.toFixed(2)).toBe("0.00");
  });

  it("una venta parcial gana contra el precio promedio", () => {
    // Promedio 100. Vende 1 a 150: +50.
    expect(realizado([mov("COMPRA", "2", "200"), mov("VENTA", "1", "150")])!.toFixed(2)).toBe("50.00");
  });

  it("vender todo con pérdida da negativo", () => {
    expect(realizado([mov("COMPRA", "2", "200"), mov("VENTA", "2", "160")])!.toFixed(2)).toBe("-40.00");
  });

  it("suma varias ventas", () => {
    // Promedio 100. Vende 1 a 120 (+20) y 1 a 90 (-10).
    const r = realizado([mov("COMPRA", "3", "300"), mov("VENTA", "1", "120"), mov("VENTA", "1", "90")]);
    expect(r!.toFixed(2)).toBe("10.00");
  });

  it("una venta sin valor en USD lo deja desconocido", () => {
    expect(realizado([mov("COMPRA", "2", "200"), mov("VENTA", "1", null)])).toBeNull();
  });

  it("vender con costo desconocido lo deja desconocido", () => {
    expect(realizado([mov("COMPRA", "2", null), mov("VENTA", "1", "150")])).toBeNull();
  });

  it("vender más de lo que figura (faltan compras) lo deja desconocido", () => {
    expect(realizado([mov("COMPRA", "1", "100"), mov("VENTA", "2", "300")])).toBeNull();
  });
});

describe("costos con transferencias y futuros (datos inventados)", () => {
  const f = (d: number) => new Date(Date.UTC(2026, 0, d));
  const compra = { simbolo: "X", tipo: "COMPRA", cantidad: "10", totalUsd: "100", fecha: f(1) };

  it("una transferencia entre cuentas propias solo saca la comisión: el costo queda en lo que sigue", () => {
    const p = calcularPreciosPromedio([compra, { simbolo: "X", tipo: "TRANSFER", cantidad: "8", totalUsd: null, fecha: f(2), cuenta: "A", cuentaDestino: "B", comision: "2", simboloComision: "X" }]);
    expect(p.get("X")!.toFixed()).toBe("12.5");
  });

  it("lo que entra desde EXTERNO no tiene costo; lo que sale se lleva su parte", () => {
    const p = calcularPreciosPromedio([
      compra,
      { simbolo: "X", tipo: "TRANSFER", cantidad: "10", totalUsd: null, fecha: f(2), cuenta: "EXTERNO", cuentaDestino: "A" },
      { simbolo: "X", tipo: "TRANSFER", cantidad: "10", totalUsd: null, fecha: f(3), cuenta: "A", cuentaDestino: "EXTERNO" },
    ]);
    expect(p.get("X")!.toFixed()).toBe("5");
  });

  it("una ganancia de futuros en la moneda suma unidades a costo 0", () => {
    const p = calcularPreciosPromedio([compra, { simbolo: "X", tipo: "PNL_FUTUROS", cantidad: "10", totalUsd: null, fecha: f(2) }]);
    expect(p.get("X")!.toFixed()).toBe("5");
  });
});
