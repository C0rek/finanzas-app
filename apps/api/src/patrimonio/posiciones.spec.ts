import { describe, expect, it } from "vitest";
import { Decimal } from "../decimal.js";
import type { ActivoValuable, PrecioVigente } from "../precios/proveedor-precios.js";
import { armarPosiciones } from "./posiciones.js";
import { valuar } from "./valuador.js";

// ⚠️ Datos inventados para los tests.
const AHORA = new Date("2026-03-01T12:00:00.000Z");
const precio = (precioUsd: string, extra: Partial<PrecioVigente> = {}): PrecioVigente => ({
  precioUsd, del: AHORA, origen: "API", desactualizado: false, ...extra,
});
const ACTIVOS: ActivoValuable[] = [
  { id: 1, simbolo: "AAA", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "A" },
  { id: 2, simbolo: "CED", ratio: "10", fuentePrecio: "BOLSA", simboloPrecio: "C" },
  { id: 3, simbolo: "SIN", ratio: null, fuentePrecio: "CRIPTO", simboloPrecio: "S" },
];
const TIPOS = new Map([["AAA", "CRIPTO"], ["CED", "CEDEAR"], ["SIN", "FONDO"]]);

function armar(cantidades: Record<string, string>, precios: Map<string, PrecioVigente>, promedios: Record<string, string | null>, saldosNegativos: string[] = [], grupos = new Map<string, string>(), realizados: Record<string, string | null> = {}) {
  const posiciones = Object.entries(cantidades).map(([simbolo, cantidad]) => ({ simbolo, cantidad: new Decimal(cantidad) }));
  const valuacion = valuar(posiciones, saldosNegativos, ACTIVOS, precios, AHORA, grupos);
  return armarPosiciones({
    valuacion, posiciones, activos: ACTIVOS, precios, tipos: TIPOS, grupos,
    cuentas: new Map([["AAA", [{ cuenta: "BINANCE", cantidad: new Decimal("0.5") }, { cuenta: "IOL", cantidad: new Decimal("1.5") }]]]),
    promedios: new Map(Object.entries(promedios).map(([k, v]) => [k, v === null ? null : new Decimal(v)])),
    realizados: new Map(Object.entries(realizados).map(([k, v]) => [k, v === null ? null : new Decimal(v)])),
    movimientosHasta: new Date("2026-02-20T10:00:00.000Z"),
  });
}

describe("armarPosiciones", () => {
  it("calcula valor y resultado no realizado de un activo", () => {
    const r = armar({ AAA: "2" }, new Map([["AAA", precio("150")]]), { AAA: "100" });
    expect(r.posiciones[0]).toEqual({
      activo: "AAA", cantidad: "2", ubicacion: "Binance · IOL", categoria: "Cripto",
      precioUsd: "150", precioPromedioUsd: "100.00000000", valorUsd: "300.00", noRealizadaUsd: "100.00",
      noRealizadaPct: "50.00", realizadaUsd: null,
      // De más a menos cantidad, cada una valorizada.
      cuentas: [
        { cuenta: "IOL", cantidad: "1.5", valorUsd: "225.00" },
        { cuenta: "Binance", cantidad: "0.5", valorUsd: "75.00" },
      ],
    });
  });

  it("informa el resultado realizado; la liquidez no tiene", () => {
    const grupos = new Map([["SIN", "LIQUIDEZ"]]);
    const precios = new Map([["AAA", precio("150")], ["SIN", precio("1")]]);
    const r = armar({ AAA: "2", SIN: "10" }, precios, { AAA: "100" }, [], grupos, { AAA: "-12.5", SIN: "3" });
    expect(r.posiciones.find((p) => p.activo === "AAA")!.realizadaUsd).toBe("-12.50");
    expect(r.posiciones.find((p) => p.activo === "SIN")!.realizadaUsd).toBeNull();
  });

  it("el % no realizado es sobre lo que costó lo que tenés", () => {
    // Costó 200 (2 × 100), hoy vale 170: -30 es -15%.
    const r = armar({ AAA: "2" }, new Map([["AAA", precio("85")]]), { AAA: "100" });
    expect(r.posiciones[0]).toMatchObject({ noRealizadaUsd: "-30.00", noRealizadaPct: "-15.00" });
  });

  it("dice hasta cuándo llegan los movimientos", () => {
    const r = armar({ AAA: "1" }, new Map([["AAA", precio("90")]]), { AAA: "100" });
    expect(r.movimientosHasta).toBe("2026-02-20T10:00:00.000Z");
  });

  it("expresa el promedio de un CEDEAR por unidad del subyacente", () => {
    // 40 CEDEARs, ratio 10: equivalen a 4. Costo 10 por CEDEAR = 100 por subyacente. Hoy 120.
    const r = armar({ CED: "40" }, new Map([["CED", precio("120")]]), { CED: "10" });
    expect(r.posiciones[0]).toMatchObject({ categoria: "CEDEAR", precioPromedioUsd: "100.00000000", valorUsd: "480.00", noRealizadaUsd: "80.00" });
  });

  it("un resultado negativo conserva el signo", () => {
    const r = armar({ AAA: "1" }, new Map([["AAA", precio("90")]]), { AAA: "100" });
    expect(r.posiciones[0]!.noRealizadaUsd).toBe("-10.00");
  });

  it("un resultado que redondea a 0 no queda como -0.00", () => {
    const r = armar({ AAA: "1" }, new Map([["AAA", precio("100")]]), { AAA: "100.001" });
    expect(r.posiciones[0]!.noRealizadaUsd).toBe("0.00");
    expect(r.total.noRealizadaUsd).toBe("0.00");
    expect(r.total.noRealizadaPct).toBe("0.00");
  });

  it("sin costo conocido no inventa el resultado y avisa", () => {
    const r = armar({ AAA: "1" }, new Map([["AAA", precio("90")]]), { AAA: null });
    expect(r.posiciones[0]).toMatchObject({ precioPromedioUsd: null, noRealizadaUsd: null, noRealizadaPct: null, valorUsd: "90.00" });
    expect(r.avisos.sinPrecioPromedio).toEqual(["AAA"]);
  });

  it("sin precio muestra la fila, sin valor ni resultado", () => {
    const r = armar({ SIN: "1" }, new Map(), { SIN: "5" });
    expect(r.posiciones[0]).toMatchObject({ activo: "SIN", categoria: "Fondo", ubicacion: "Sin saldo", valorUsd: null, noRealizadaUsd: null, precioPromedioUsd: "5.00000000" });
    expect(r.avisos.sinValorizar).toEqual(["SIN"]);
  });

  it("ordena por valor, con los que no tienen precio al final", () => {
    const r = armar({ AAA: "1", CED: "100", SIN: "1" }, new Map([["AAA", precio("10")], ["CED", precio("10")]]), {});
    expect(r.posiciones.map((p) => p.activo)).toEqual(["CED", "AAA", "SIN"]);
  });

  it("el total de valor coincide con el patrimonio y suma los resultados conocidos", () => {
    const r = armar(
      { AAA: "1", CED: "10" },
      new Map([["AAA", precio("110")], ["CED", precio("50")]]),
      { AAA: "100", CED: null },
    );
    // El costo solo suma las posiciones con resultado conocido: así el % sobre el costo es coherente.
    expect(r.total).toEqual({ valorUsd: "160.00", noRealizadaUsd: "10.00", noRealizadaPct: "10.00", costoUsd: "100.00" });
  });

  it("deja afuera el colchón: el total es de las posiciones", () => {
    const r = armar(
      { AAA: "1", CED: "10" },
      new Map([["AAA", precio("110")], ["CED", precio("50")]]),
      { AAA: "100", CED: "40" },
      [],
      new Map([["CED", "COLCHON"]]),
    );
    expect(r.posiciones.map((p) => p.activo)).toEqual(["AAA"]);
    expect(r.total).toEqual({ valorUsd: "110.00", noRealizadaUsd: "10.00", noRealizadaPct: "10.00", costoUsd: "100.00" });
  });

  it("la liquidez es una fila más, sin resultado y sin aviso de costo", () => {
    const r = armar(
      { AAA: "1", SIN: "30" },
      new Map([["AAA", precio("110")], ["SIN", precio("1")]]),
      { AAA: "100", SIN: null },
      [],
      new Map([["SIN", "LIQUIDEZ"]]),
    );
    expect(r.posiciones.find((p) => p.activo === "SIN")).toMatchObject({ categoria: "Liquidez", valorUsd: "30.00", noRealizadaUsd: null });
    expect(r.avisos.sinPrecioPromedio).toEqual([]);
    expect(r.total).toEqual({ valorUsd: "140.00", noRealizadaUsd: "10.00", noRealizadaPct: "10.00", costoUsd: "100.00" });
  });

  it("pasa los saldos negativos y los precios desactualizados a los avisos", () => {
    const viejo = new Date("2026-02-01T00:00:00.000Z");
    const r = armar({ AAA: "1" }, new Map([["AAA", precio("10", { del: viejo, desactualizado: true })]]), { AAA: "5" }, ["NEG"]);
    expect(r.avisos).toMatchObject({
      saldosNegativos: ["NEG"],
      desactualizados: [{ simbolo: "AAA", precioDel: viejo.toISOString() }],
    });
  });
});
