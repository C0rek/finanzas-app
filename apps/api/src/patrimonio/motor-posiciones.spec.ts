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

  it("ignora los tipos que no mueven saldos", () => {
    const r = calcularPosiciones(["APORTE", "REWARD", "COMISION"].map((t) => mov(t, "5")));
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

  describe("liquidez con SALDO (datos inventados)", () => {
    const dia = (d: number) => new Date(Date.UTC(2026, 0, d));
    const usdt = (r: ReturnType<typeof calcularPosiciones>) => r.posiciones.find((p) => p.simbolo === "USDT")?.cantidad.toFixed();
    const compra = (d: number, total: string, extra: Partial<MovimientoPosicion> = {}): MovimientoPosicion => ({
      simbolo: "BTC", tipo: "COMPRA", cantidad: "0.001", fecha: dia(d), cuenta: "EXCH", simboloPago: "USDT", total, ...extra,
    });
    const saldo = (d: number, cantidad: string, cuenta = "EXCH"): MovimientoPosicion => ({ simbolo: "USDT", tipo: "SALDO", cantidad, fecha: dia(d), cuenta });

    it("una compra posterior al SALDO descuenta lo pagado; una venta lo suma", () => {
      const r = calcularPosiciones([saldo(1, "1000"), compra(2, "100"), compra(3, "40", { tipo: "VENTA" })]);
      expect(usdt(r)).toBe("940");
      expect(r.posiciones.find((p) => p.simbolo === "BTC")).toBeUndefined(); // compró 0.001 y vendió 0.001
    });

    it("las compras anteriores al SALDO no tocan la liquidez", () => {
      const r = calcularPosiciones([compra(1, "500"), saldo(2, "1000")]);
      expect(usdt(r)).toBe("1000");
      expect(r.saldosNegativos).toEqual([]);
    });

    it("el SALDO pisa lo que había antes de ese activo en esa cuenta", () => {
      const r = calcularPosiciones([{ simbolo: "USDT", tipo: "AJUSTE", cantidad: "2000", fecha: dia(1), cuenta: "EXCH" }, saldo(2, "750")]);
      expect(usdt(r)).toBe("750");
    });

    it("USDT se sigue en cada cuenta aunque no tenga SALDO", () => {
      const r = calcularPosiciones([saldo(1, "1000"), compra(2, "100", { cuenta: "OTRA" })]);
      expect(usdt(r)).toBe("900");
      expect(r.porCuenta.get("USDT")).toEqual([{ cuenta: "EXCH", cantidad: expect.anything() }]); // OTRA queda en -100
    });

    it("un activo de pago que no es stablecoin solo se sigue desde su SALDO", () => {
      const r = calcularPosiciones([compra(1, "100", { simboloPago: "USD" })]);
      expect(r.posiciones.find((p) => p.simbolo === "USD")).toBeUndefined();
      expect(r.saldosNegativos).toEqual([]);
    });

    it("una comisión cobrada en el activo de pago también resta", () => {
      const r = calcularPosiciones([saldo(1, "1000"), compra(2, "100", { comision: "0.1", simboloComision: "USDT" })]);
      expect(usdt(r)).toBe("899.9");
    });
  });

  describe("transferencias y futuros (datos inventados)", () => {
    const dia = (d: number) => new Date(Date.UTC(2026, 0, d));
    const de = (r: ReturnType<typeof calcularPosiciones>, simbolo: string) =>
      (r.porCuenta.get(simbolo) ?? []).map((s) => [s.cuenta, s.cantidad.toFixed()]);
    const transfer = (d: number, cantidad: string, cuenta: string, cuentaDestino: string, comision?: string): MovimientoPosicion => ({
      simbolo: "USDT", tipo: "TRANSFER", cantidad, fecha: dia(d), cuenta, cuentaDestino, comision: comision ?? null, simboloComision: comision ? "USDT" : null,
    });

    it("una TRANSFER resta en el origen lo que salió y suma en el destino lo que llegó", () => {
      const r = calcularPosiciones([{ simbolo: "USDT", tipo: "AJUSTE", cantidad: "100", fecha: dia(1), cuenta: "A" }, transfer(2, "59.5", "A", "B", "0.5")]);
      expect(de(r, "USDT")).toEqual([["A", "40"], ["B", "59.5"]]);
    });

    it("la cuenta EXTERNO no se sigue", () => {
      const r = calcularPosiciones([transfer(1, "10", "EXTERNO", "A"), transfer(2, "4", "A", "EXTERNO")]);
      expect(de(r, "USDT")).toEqual([["A", "6"]]);
    });

    it("PNL_FUTUROS suma con signo en su cuenta", () => {
      const pnl = (d: number, cantidad: string): MovimientoPosicion => ({ simbolo: "USDT", tipo: "PNL_FUTUROS", cantidad, fecha: dia(d), cuenta: "A" });
      const r = calcularPosiciones([pnl(1, "12.5"), pnl(2, "-2.5")]);
      expect(de(r, "USDT")).toEqual([["A", "10"]]);
    });

    it("un SALDO posterior pisa la reconstrucción", () => {
      const r = calcularPosiciones([transfer(1, "10", "EXTERNO", "A"), { simbolo: "USDT", tipo: "SALDO", cantidad: "9", fecha: dia(2), cuenta: "A" }]);
      expect(de(r, "USDT")).toEqual([["A", "9"]]);
    });
  });
});
