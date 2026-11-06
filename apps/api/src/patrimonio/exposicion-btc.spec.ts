import { describe, expect, it } from "vitest";
import { Decimal } from "../decimal.js";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import { calcularExposicionBtc, ubicacionesPorActivo } from "./exposicion-btc.js";
import { valuar } from "./valuador.js";

// ⚠️ Datos inventados para los tests.
const AHORA = new Date("2026-03-01T12:00:00.000Z");
const precio = (precioUsd: string, extra: Partial<PrecioVigente> = {}): PrecioVigente => ({
  precioUsd, del: AHORA, origen: "API", desactualizado: false, ...extra,
});
const ACTIVOS: ActivoValuable[] = [
  { id: 1, simbolo: "BTC", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "BTCUSDT" },
  { id: 2, simbolo: "IBIT", ratio: "10", fuentePrecio: "BOLSA", simboloPrecio: "IBIT" },
  { id: 3, simbolo: "AAA", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "AAAUSDT" },
  { id: 4, simbolo: "BBB", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "BBBUSDT" },
  { id: 5, simbolo: "CCC", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "CCCUSDT" },
  { id: 6, simbolo: "DDD", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "DDDUSDT" },
];
const PRECIOS = new Map([
  ["BTC", precio("50000")],
  ["IBIT", precio("50")],
  ["AAA", precio("100")],
  ["BBB", precio("100")],
  ["CCC", precio("100")],
  ["DDD", precio("100")],
]);

function calcular(cantidades: Record<string, string>, precios = PRECIOS, ubicaciones = new Map<string, string[]>()) {
  const posiciones = Object.entries(cantidades).map(([simbolo, cantidad]) => ({ simbolo, cantidad: new Decimal(cantidad) }));
  const valuacion = valuar(posiciones, [], ACTIVOS, precios, AHORA);
  return calcularExposicionBtc({ valuacion, posiciones, activos: ACTIVOS, precios, ubicaciones });
}

describe("calcularExposicionBtc", () => {
  it("suma spot e IBIT, y calcula el porcentaje sobre la cartera", () => {
    // Spot: 0,01 × 50.000 = 500. IBIT: 40 ÷ 10 × 50 = 200, o sea 0,004 BTC. Otros: 500. Cartera: 1.200.
    const r = calcular({ BTC: "0.01", IBIT: "40", AAA: "5" });
    expect(r.carteraUsd).toBe("1200.00");
    expect(r.precioBtcUsd).toBe("50000");
    expect(r.cantidadBtc).toBe("0.01400000");
    expect(r.valorUsd).toBe("700.00");
    expect(r.porcentaje).toBe("58.33");
    expect(r.resto.porcentaje).toBe("41.67");
    expect(r.partes.find((p) => p.etiqueta === "Spot")).toMatchObject({ cantidadBtc: "0.01000000", porcentaje: "41.67" });
    expect(r.partes.find((p) => p.etiqueta === "IBIT")).toMatchObject({ cantidadBtc: "0.00400000", porcentaje: "16.67" });
  });

  it("muestra futuros y cold wallet en 0 como no contemplados, en el orden del boceto", () => {
    const r = calcular({ BTC: "0.01" });
    expect(r.partes.map((p) => p.etiqueta)).toEqual(["Spot", "Futuros (margen)", "IBIT", "Cold wallet"]);
    for (const etiqueta of ["Futuros (margen)", "Cold wallet"]) {
      expect(r.partes.find((p) => p.etiqueta === etiqueta)).toEqual({
        etiqueta, porcentaje: "0.00", cantidadBtc: "0.00000000", ubicacion: "No contemplado",
      });
    }
  });

  it("muestra dónde está cada parte, con el nombre legible", () => {
    const ubicaciones = new Map([["BTC", ["BINANCE", "BITUNIX"]], ["IBIT", ["IOL"]]]);
    const r = calcular({ BTC: "0.01", IBIT: "40" }, PRECIOS, ubicaciones);
    expect(r.partes.find((p) => p.etiqueta === "Spot")!.ubicacion).toBe("Binance · Bitunix");
    expect(r.partes.find((p) => p.etiqueta === "IBIT")!.ubicacion).toBe("IOL");
  });

  it("sin tenencia en una parte, queda en 0 sin saldo", () => {
    const r = calcular({ BTC: "0.01" });
    expect(r.partes.find((p) => p.etiqueta === "IBIT")).toMatchObject({ porcentaje: "0.00", ubicacion: "Sin saldo" });
  });

  it("el resto nombra los activos de mayor valor", () => {
    const r = calcular({ BTC: "1", AAA: "1", BBB: "4", CCC: "3", DDD: "2" });
    expect(r.resto.detalle).toBe("BBB, CCC, DDD y 1 más");
  });

  it("sin otros activos, el resto queda en 0 y lo dice", () => {
    const r = calcular({ BTC: "1" });
    expect(r.resto).toEqual({ porcentaje: "0.00", detalle: "Sin otros activos" });
  });

  it("con la cartera vacía no divide por cero", () => {
    const r = calcular({});
    expect(r).toMatchObject({ carteraUsd: "0.00", porcentaje: "0.00", valorUsd: "0.00", cantidadBtc: "0.00000000" });
  });

  it("sin precio de Bitcoin no inventa una cantidad para el IBIT", () => {
    const sinBtc = new Map(PRECIOS);
    sinBtc.delete("BTC");
    const r = calcular({ BTC: "0.01", IBIT: "40" }, sinBtc);
    expect(r.precioBtcUsd).toBeNull();
    expect(r.partes.find((p) => p.etiqueta === "IBIT")!.cantidadBtc).toBe("0.00000000");
  });

  it("avisa solo de los problemas de precio de BTC e IBIT", () => {
    const viejo = new Date("2026-02-01T00:00:00.000Z");
    const precios = new Map(PRECIOS);
    precios.set("BTC", precio("50000", { del: viejo, desactualizado: true }));
    precios.set("AAA", precio("100", { del: viejo, desactualizado: true }));
    precios.delete("IBIT");
    const r = calcular({ BTC: "1", IBIT: "40", AAA: "1", BBB: "1" }, precios);
    expect(r.avisos).toEqual({
      desactualizados: [{ simbolo: "BTC", precioDel: viejo.toISOString() }],
      sinValorizar: ["IBIT"],
    });
  });
});

describe("ubicacionesPorActivo", () => {
  const mov = (simbolo: string, tipo: string, cantidad: string, cuenta: string) => ({ simbolo, tipo, cantidad, cuenta });

  it("lista solo las cuentas donde queda saldo", () => {
    const u = ubicacionesPorActivo([
      mov("BTC", "COMPRA", "1", "UNA"),
      mov("BTC", "COMPRA", "1", "OTRA"),
      mov("BTC", "VENTA", "1", "OTRA"),
    ]);
    expect(u.get("BTC")).toEqual(["UNA"]);
  });

  it("ordena las cuentas por nombre", () => {
    const u = ubicacionesPorActivo([mov("BTC", "COMPRA", "1", "ZETA"), mov("BTC", "COMPRA", "1", "ALFA")]);
    expect(u.get("BTC")).toEqual(["ALFA", "ZETA"]);
  });
});
