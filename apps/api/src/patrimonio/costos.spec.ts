import { describe, expect, it } from "vitest";
import { calcularPreciosPromedio, type MovimientoCosto } from "./costos.js";

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
