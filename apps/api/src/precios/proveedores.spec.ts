import { afterEach, describe, expect, it, vi } from "vitest";
import { ProveedorBinance } from "./binance.js";
import { ProveedorFinnhub } from "./finnhub.js";

const respuesta = (cuerpo: unknown, status = 200) => new Response(JSON.stringify(cuerpo), { status });

afterEach(() => vi.unstubAllGlobals());

describe("ProveedorBinance", () => {
  it("devuelve solo los símbolos pedidos, con el precio como texto exacto", async () => {
    vi.stubGlobal("fetch", vi.fn(async () =>
      respuesta([
        { symbol: "AAAUSDT", price: "0.12345678" },
        { symbol: "BBBUSDT", price: "2.00000000" },
      ]),
    ));
    const precios = await new ProveedorBinance().obtener(["AAAUSDT"]);
    expect([...precios.keys()]).toEqual(["AAAUSDT"]);
    expect(precios.get("AAAUSDT")!.precioUsd).toBe("0.12345678");
  });

  it("no usa el parámetro symbols, que falla entero si un símbolo no existe", async () => {
    const f = vi.fn(async (_url: string) => respuesta([]));
    vi.stubGlobal("fetch", f);
    await new ProveedorBinance().obtener(["AAAUSDT"]);
    expect(String(f.mock.calls[0]![0])).not.toContain("symbols");
  });

  it("un símbolo inexistente queda ausente sin afectar a los demás", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta([{ symbol: "AAAUSDT", price: "1" }])));
    const precios = await new ProveedorBinance().obtener(["AAAUSDT", "ZZZUSDT"]);
    expect(precios.has("AAAUSDT")).toBe(true);
    expect(precios.has("ZZZUSDT")).toBe(false);
  });

  it.each([["0.00000000"], ["abc"], [""]])("un precio inválido (%s) queda ausente", async (price) => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta([{ symbol: "AAAUSDT", price }])));
    expect((await new ProveedorBinance().obtener(["AAAUSDT"])).size).toBe(0);
  });

  it("lanza si el proveedor responde con error", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta({}, 500)));
    await expect(new ProveedorBinance().obtener(["AAAUSDT"])).rejects.toThrow();
  });

  it("lanza si la conexión falla", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("timeout"); }));
    await expect(new ProveedorBinance().obtener(["AAAUSDT"])).rejects.toThrow();
  });

  it("no consulta nada si no se pide ningún símbolo", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    expect((await new ProveedorBinance().obtener([])).size).toBe(0);
    expect(f).not.toHaveBeenCalled();
  });
});

describe("ProveedorFinnhub", () => {
  it("toma el precio de c y la fecha de t, y pide con la clave", async () => {
    const f = vi.fn(async (_url: string) => respuesta({ c: 738.66, t: 1793991030 }));
    vi.stubGlobal("fetch", f);
    const precios = await new ProveedorFinnhub("clave").obtener(["SSS"]);
    expect(precios.get("SSS")).toEqual({ precioUsd: "738.66", del: new Date(1793991030 * 1000) });
    expect(String(f.mock.calls[0]![0])).toContain("symbol=SSS");
    expect(String(f.mock.calls[0]![0])).toContain("token=clave");
  });

  it.each([[{ c: 0, t: 0 }], [{}], [{ c: "x", t: 1 }]])("un símbolo sin precio válido (%j) queda ausente", async (cuerpo) => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta(cuerpo)));
    expect((await new ProveedorFinnhub("clave").obtener(["SSS"])).size).toBe(0);
  });

  it("si un símbolo falla pero otro responde, devuelve el que respondió", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("symbol=BIEN") ? respuesta({ c: 10, t: 1 }) : respuesta({}, 500),
    ));
    const precios = await new ProveedorFinnhub("clave").obtener(["BIEN", "MAL"]);
    expect([...precios.keys()]).toEqual(["BIEN"]);
  });

  it("lanza si fallan todos", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => respuesta({}, 500)));
    await expect(new ProveedorFinnhub("clave").obtener(["SSS"])).rejects.toThrow();
  });

  it("sin clave lanza nombrando la variable que falta", async () => {
    await expect(new ProveedorFinnhub(undefined).obtener(["SSS"])).rejects.toThrow(/FINNHUB_API_KEY/);
  });
});
