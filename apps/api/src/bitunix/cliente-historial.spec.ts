import { describe, expect, it } from "vitest";
import { ClienteBitunix, type PosicionHistorica } from "./cliente-bitunix.js";

// ⚠️ Datos inventados para los tests.
const posicion = (id: string): PosicionHistorica => ({
  positionId: id, symbol: "BTCUSDT", marginCoin: null, maxQty: "1", qty: "1", entryPrice: "100", closePrice: "101",
  liqQty: null, side: "BUY", positionMode: "HEDGE", marginMode: "ISOLATION", leverage: "10", fee: "0.1", funding: "0",
  realizedPNL: "1", margin: null, liqPrice: "0", ctime: "1", mtime: "2",
});

describe("ClienteBitunix.historialPosiciones", () => {
  it("pagina de a 100 hasta el total y manda la firma en los headers", async () => {
    const pedidos: string[] = [];
    const fetchFalso = (async (url: string, init?: RequestInit) => {
      pedidos.push(url);
      const headers = init?.headers as Record<string, string>;
      expect(headers["sign"]).toBeTruthy();
      const skip = Number(new URL(url).searchParams.get("skip"));
      const lista = skip === 0 ? [posicion("1"), posicion("2")] : [posicion("3")];
      return new Response(JSON.stringify({ code: 0, msg: "Success", data: { positionList: lista, total: 3 } }), { status: 200 });
    }) as unknown as typeof fetch;

    const cliente = new ClienteBitunix("clave", "secreta");
    const todas = await cliente.historialPosiciones({}, fetchFalso);

    expect(todas.map((p) => p.positionId)).toEqual(["1", "2", "3"]);
    expect(pedidos).toHaveLength(2);
    expect(pedidos[0]).toContain("/api/v1/futures/position/get_history_positions");
    expect(pedidos[0]).toContain("limit=100");
  });

  it("si Bitunix responde con error de código, falla en vez de devolver vacío", async () => {
    const fetchFalso = (async () =>
      new Response(JSON.stringify({ code: 10003, msg: "invalid sign", data: null }), { status: 200 })) as unknown as typeof fetch;
    const cliente = new ClienteBitunix("clave", "secreta");
    await expect(cliente.historialPosiciones({}, fetchFalso)).rejects.toThrow("invalid sign");
  });
});
