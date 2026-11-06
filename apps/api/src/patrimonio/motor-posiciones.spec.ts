import { describe, expect, it } from "vitest";
import { calcularPosiciones, type MovimientoPosicion } from "./motor-posiciones.js";

const mov = (tipo: string, cantidad: string, simbolo = "X"): MovimientoPosicion => ({ simbolo, tipo, cantidad });

describe("calcularPosiciones", () => {
  it("suma compras y resta ventas", () => {
    const { posiciones } = calcularPosiciones([mov("COMPRA", "1.5"), mov("VENTA", "0.5")]);
    expect(posiciones.map((p) => [p.simbolo, p.cantidad.toString()])).toEqual([["X", "1"]]);
  });

  it("un AJUSTE suma", () => {
    const { posiciones } = calcularPosiciones([mov("AJUSTE", "12")]);
    expect(posiciones[0]!.cantidad.toString()).toBe("12");
  });

  it("no pierde precisión como un float", () => {
    const { posiciones } = calcularPosiciones([mov("COMPRA", "0.1"), mov("COMPRA", "0.2")]);
    expect(posiciones[0]!.cantidad.toString()).toBe("0.3");
  });

  it("un saldo exactamente 0 no aparece en ningún lado", () => {
    const r = calcularPosiciones([mov("COMPRA", "2"), mov("VENTA", "2")]);
    expect(r.posiciones).toEqual([]);
    expect(r.saldosNegativos).toEqual([]);
  });

  it("un saldo negativo no suma y se informa", () => {
    const r = calcularPosiciones([mov("VENTA", "3")]);
    expect(r.posiciones).toEqual([]);
    expect(r.saldosNegativos).toEqual(["X"]);
  });

  it("ignora los tipos que no son spot", () => {
    const r = calcularPosiciones(
      ["TRANSFER", "APORTE", "REWARD", "COMISION", "PNL_FUTUROS"].map((t) => mov(t, "5")),
    );
    expect(r.posiciones).toEqual([]);
    expect(r.saldosNegativos).toEqual([]);
  });

  it("una compra vendida por partes con 18 decimales queda exactamente en 0", () => {
    const r = calcularPosiciones([
      mov("COMPRA", "10000.123456789012345678"),
      mov("VENTA", "10000"),
      mov("VENTA", "0.123456789012345678"),
    ]);
    expect(r.posiciones).toEqual([]);
    expect(r.saldosNegativos).toEqual([]);
  });

  it("no inventa un saldo negativo por falta de precisión", () => {
    const r = calcularPosiciones([
      mov("COMPRA", "10000.123456789012344322"),
      mov("VENTA", "10000"),
      mov("VENTA", "0.123456789012344322"),
    ]);
    expect(r.saldosNegativos).toEqual([]);
  });

  it("conserva todos los dígitos de la cantidad", () => {
    const { posiciones } = calcularPosiciones([mov("COMPRA", "12345.123456789012345678")]);
    expect(posiciones[0]!.cantidad.toFixed()).toBe("12345.123456789012345678");
  });

  it("consolida por activo y ordena por símbolo", () => {
    const r = calcularPosiciones([mov("COMPRA", "1", "B"), mov("COMPRA", "2", "A"), mov("COMPRA", "3", "B")]);
    expect(r.posiciones.map((p) => [p.simbolo, p.cantidad.toString()])).toEqual([["A", "2"], ["B", "4"]]);
  });
});
