import { Decimal } from "../decimal.js";
import { describe, expect, it } from "vitest";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import { valuar } from "./valuador.js";

const AHORA = new Date("2026-03-01T12:00:00.000Z");
const posicion = (simbolo: string, cantidad: string) => ({ simbolo, cantidad: new Decimal(cantidad) });
const activo = (simbolo: string, extra: Partial<ActivoValuable> = {}): ActivoValuable => ({
  id: 1, simbolo, ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: simbolo, ...extra,
});
const precio = (precioUsd: string, extra: Partial<PrecioVigente> = {}): PrecioVigente => ({
  precioUsd, del: AHORA, origen: "API", desactualizado: false, ...extra,
});

describe("valuar", () => {
  it("divide por el ratio al valorizar un CEDEAR, sin cambiar la cantidad", () => {
    const r = valuar([posicion("C", "40")], [], [activo("C", { ratio: "10", fuentePrecio: "BOLSA" })], new Map([["C", precio("50")]]), AHORA);
    expect(r.activos[0]).toMatchObject({ simbolo: "C", cantidad: "40", precioUsd: "50", valorUsd: "200.00" });
    expect(r.totalUsd).toBe("200.00");
  });

  it("suma con decimales exactos", () => {
    const r = valuar(
      [posicion("A", "0.1"), posicion("B", "0.2")], [], [activo("A"), activo("B")],
      new Map([["A", precio("3")], ["B", precio("3")]]), AHORA,
    );
    expect(r.totalUsd).toBe("0.90");
  });

  it("suma sin redondear y formatea recién al final", () => {
    const r = valuar(
      [posicion("A", "1"), posicion("B", "1")], [], [activo("A"), activo("B")],
      new Map([["A", precio("0.004")], ["B", precio("0.004")]]), AHORA,
    );
    expect(r.totalUsd).toBe("0.01");
  });

  it("una posición sin precio no suma y queda en sinValorizar", () => {
    const r = valuar([posicion("A", "1"), posicion("B", "1")], [], [activo("A"), activo("B")], new Map([["A", precio("5")]]), AHORA);
    expect(r.totalUsd).toBe("5.00");
    expect(r.avisos.sinValorizar).toEqual(["B"]);
    expect(r.activos.map((a) => a.simbolo)).toEqual(["A"]);
  });

  it("una posición sin fuente de precio queda en sinValorizar", () => {
    const r = valuar([posicion("A", "1")], [], [activo("A", { fuentePrecio: null })], new Map(), AHORA);
    expect(r.avisos.sinValorizar).toEqual(["A"]);
  });

  it("un precio desactualizado suma y se avisa con su fecha", () => {
    const del = new Date("2026-02-01T00:00:00.000Z");
    const r = valuar([posicion("A", "2")], [], [activo("A")], new Map([["A", precio("5", { del, desactualizado: true })]]), AHORA);
    expect(r.totalUsd).toBe("10.00");
    expect(r.avisos.desactualizados).toEqual([{ simbolo: "A", precioDel: del.toISOString() }]);
  });

  it("incluye metadatos, origen del precio y saldos negativos", () => {
    const r = valuar([posicion("A", "1")], ["N"], [activo("A")], new Map([["A", precio("5", { origen: "MANUAL" })]]), AHORA);
    expect(r.parcial).toBe(true);
    expect(r.calculadoEn).toBe(AHORA.toISOString());
    expect(r.avisos.saldosNegativos).toEqual(["N"]);
    expect(r.activos[0]).toMatchObject({ origenPrecio: "MANUAL", precioDel: AHORA.toISOString() });
  });

  it("sin posiciones, el total es 0.00", () => {
    const r = valuar([], [], [], new Map(), AHORA);
    expect(r).toMatchObject({ totalUsd: "0.00", activos: [], desglose: { inversionUsd: "0.00", liquidezUsd: "0.00", colchonUsd: "0.00" } });
  });

  it("la cartera de inversión incluye la liquidez; el colchón va aparte", () => {
    const r = valuar(
      [posicion("A", "2"), posicion("LIQ", "30"), posicion("COL", "100")],
      [],
      [activo("A"), activo("LIQ"), activo("COL")],
      new Map([["A", precio("10")], ["LIQ", precio("1")], ["COL", precio("1.5")]]),
      AHORA,
      new Map([["LIQ", "LIQUIDEZ"], ["COL", "COLCHON"]]),
    );
    expect(r.desglose).toEqual({ inversionUsd: "50.00", liquidezUsd: "30.00", colchonUsd: "150.00" });
    expect(r.totalUsd).toBe("200.00");
    expect(r.activos.map((a) => a.grupo)).toEqual(["POSICION", "LIQUIDEZ", "COLCHON"]);
  });
});
