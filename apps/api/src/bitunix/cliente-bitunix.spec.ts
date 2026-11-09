// Las claves de estos tests son inventadas.
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ClienteBitunix, firmar } from "./cliente-bitunix.js";

const sha256 = (texto: string) => createHash("sha256").update(texto).digest("hex");
const CLAVES = { apiKey: "clave-de-prueba", secretKey: "secreto-de-prueba" };

describe("firmar", () => {
  it("aplica el doble SHA-256 que pide Bitunix", () => {
    const digest = sha256("nonce1" + "1700000000000" + "clave-de-prueba" + "id1uid200");
    expect(
      firmar({ ...CLAVES, nonce: "nonce1", timestamp: "1700000000000", query: { uid: "200", id: "1" } }),
    ).toBe(sha256(digest + "secreto-de-prueba"));
  });
});

describe("ClienteBitunix", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sin claves no está configurado y no deja preparar peticiones", () => {
    const cliente = new ClienteBitunix(undefined, undefined);
    expect(cliente.configurado).toBe(false);
    expect(() => cliente.prepararLectura("/ruta")).toThrow("BITUNIX_API_KEY");
  });

  it("prepara una lectura firmada sin mandar nada a la red ni exponer el secreto", () => {
    const fetchEspia = vi.spyOn(globalThis, "fetch");
    const ahora = new Date("2026-11-06T12:00:00Z");
    const cliente = new ClienteBitunix(CLAVES.apiKey, CLAVES.secretKey, () => ahora);

    const peticion = cliente.prepararLectura("/api/ruta", { b: "2 3", a: "1" });

    expect(cliente.configurado).toBe(true);
    expect(peticion.metodo).toBe("GET");
    expect(peticion.url).toBe("https://fapi.bitunix.com/api/ruta?a=1&b=2+3");
    expect(peticion.headers["api-key"]).toBe(CLAVES.apiKey);
    expect(peticion.headers.timestamp).toBe(String(ahora.getTime()));
    expect(peticion.headers.nonce).toMatch(/^[0-9a-f]{32}$/);
    expect(peticion.headers.sign).toBe(
      firmar({ ...CLAVES, nonce: peticion.headers.nonce, timestamp: peticion.headers.timestamp, query: { a: "1", b: "2 3" } }),
    );
    expect(JSON.stringify(peticion)).not.toContain(CLAVES.secretKey);
    expect(JSON.stringify(cliente)).not.toContain(CLAVES.secretKey);
    expect(fetchEspia).not.toHaveBeenCalled();
  });
});
