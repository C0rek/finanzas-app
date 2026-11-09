import { describe, expect, it } from "vitest";
import { armarMovimientos, type FilaMovimiento } from "./armar-movimientos.js";

// ⚠️ Datos inventados para los tests.
const fila = (extra: Partial<FilaMovimiento>): FilaMovimiento => ({
  id: 1, fecha: new Date("2026-01-01T12:00:00.000Z"), tipo: "COMPRA", simbolo: "X", cantidad: "1",
  precio: "100", total: "100", totalUsd: "100", moneda: "USD", cuenta: "BINANCE",
  comision: null, simboloComision: null, idExterno: "e1", nota: null, ...extra,
});

describe("armarMovimientos", () => {
  it("una compra resta de la caja y una venta suma", () => {
    const [venta, compra] = armarMovimientos([
      fila({ id: 1 }),
      fila({ id: 2, tipo: "VENTA", fecha: new Date("2026-01-02T12:00:00.000Z"), total: "120", totalUsd: "120", precio: "120" }),
    ]);
    expect(compra).toMatchObject({ id: 1, totalUsd: "-100", total: "-100", precioUsd: "100" });
    expect(venta).toMatchObject({ id: 2, totalUsd: "120", total: "120" });
  });

  it("devuelve del más nuevo al más viejo", () => {
    const r = armarMovimientos([
      fila({ id: 1, fecha: new Date("2026-01-01T00:00:00Z") }),
      fila({ id: 2, fecha: new Date("2026-03-01T00:00:00Z") }),
      fila({ id: 3, fecha: new Date("2026-02-01T00:00:00Z") }),
    ]);
    expect(r.map((m) => m.id)).toEqual([2, 3, 1]);
  });

  it("calcula el impacto en la posición de cada activo", () => {
    const r = armarMovimientos([
      fila({ id: 1, cantidad: "2", fecha: new Date("2026-01-01T00:00:00Z") }),
      fila({ id: 2, cantidad: "0.5", tipo: "VENTA", fecha: new Date("2026-01-02T00:00:00Z") }),
      fila({ id: 3, simbolo: "Y", cantidad: "7", fecha: new Date("2026-01-03T00:00:00Z") }),
    ]);
    expect(r.find((m) => m.id === 1)!.impacto).toEqual({ antes: "0", despues: "2" });
    expect(r.find((m) => m.id === 2)!.impacto).toEqual({ antes: "2", despues: "1.5" });
    expect(r.find((m) => m.id === 3)!.impacto).toEqual({ antes: "0", despues: "7" });
  });

  it("un movimiento en pesos sin valor en USD conserva los pesos y deja el USD vacío", () => {
    const [m] = armarMovimientos([fila({ moneda: "ARS", precio: "5000", total: "5000", totalUsd: null })]);
    expect(m).toMatchObject({ moneda: "ARS", precio: "5000", total: "-5000", precioUsd: null, totalUsd: null });
  });

  it("un movimiento en pesos con valor en USD deriva el precio en USD", () => {
    const [m] = armarMovimientos([fila({ moneda: "ARS", cantidad: "4", precio: "5000", total: "20000", totalUsd: "20" })]);
    expect(m).toMatchObject({ precioUsd: "5", totalUsd: "-20" });
  });

  it("un AJUSTE no mueve la caja", () => {
    const [m] = armarMovimientos([fila({ tipo: "AJUSTE", precio: null, total: null, totalUsd: null })]);
    expect(m).toMatchObject({ total: null, totalUsd: null, precioUsd: null });
  });

  it("muestra la cuenta legible, el origen y la comisión en su activo", () => {
    const [m] = armarMovimientos([fila({ comision: "0.5", simboloComision: "USDT", nota: "hola" })]);
    expect(m).toMatchObject({
      cuenta: "Binance", origen: "IMPORTADO", comision: { monto: "0.5", activo: "USDT" },
      idExterno: "e1", nota: "hola", etiquetas: [], cuentaDestino: null, p2p: false,
    });
  });
});
