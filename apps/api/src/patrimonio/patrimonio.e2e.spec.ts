import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { copiarFixtures, FIXTURES, limpiarBase } from "../../test/ayudantes.js";
import { AppModule, PRISMA, PROVEEDORES } from "../app.module.js";
import { crearPrisma } from "../prisma.js";
import type { PrecioObtenido, ProveedorPrecios } from "../precios/proveedor-precios.js";
import { volcar } from "../volcado/volcar.js";

const prisma = crearPrisma();
const HORA = new Date("2026-03-01T12:00:00.000Z");

const proveedorFalso = (precios: Record<string, string>): ProveedorPrecios => ({
  async obtener(simbolos) {
    const salida = new Map<string, PrecioObtenido>();
    for (const s of simbolos) if (precios[s]) salida.set(s, { precioUsd: precios[s], del: HORA });
    return salida;
  },
});

const PROVEEDORES_FALSOS = {
  CRIPTO: proveedorFalso({ CRIPTOXUSDT: "100", BTCUSDT: "50000" }),
  BOLSA: proveedorFalso({ CEDX: "50", IBIT: "50" }),
};

let app: INestApplication | undefined;

async function levantar(prismaApp: unknown = prisma): Promise<string> {
  const modulo = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PRISMA).useValue(prismaApp)
    .overrideProvider(PROVEEDORES).useValue(PROVEEDORES_FALSOS)
    .compile();
  app = modulo.createNestApplication({ logger: false });
  await app.listen(0, "127.0.0.1");
  return `${await app.getUrl()}/patrimonio`;
}

beforeEach(() => limpiarBase(prisma));
afterEach(async () => { await app?.close(); app = undefined; });
afterAll(() => prisma.$disconnect());

describe("GET /patrimonio", () => {
  it("devuelve el total sacado de la base, igual a la cuenta hecha a mano", async () => {
    await volcar(prisma, FIXTURES);
    const respuesta = await fetch(await levantar());
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    // CRIPTOX: 1,5 × 100 = 150. CEDEARX: 45 ÷ 10 × 50 = 225. FONDOX: 100 × 1,25 = 125. BONOX: 0.
    expect(cuerpo.totalUsd).toBe("500.00");
    expect(cuerpo.parcial).toBe(true);
    expect(cuerpo.activos.map((a: { simbolo: string }) => a.simbolo)).toEqual(["CEDEARX", "CRIPTOX", "FONDOX"]);
  });

  it("GET /patrimonio/exposicion-btc calcula la exposición desde la base", async () => {
    const dir = copiarFixtures({
      catalogo: (t) =>
        `${t}BTC,Bitcoin inventado,CRIPTO,,CRIPTO,BTCUSDT,,,\nIBIT,ETF inventado,CEDEAR,10,BOLSA,IBIT,,,\n`,
      spot: (t) =>
        `${t}f8,2026-01-16T12:00:00Z,BINANCE,COMPRA,BTC,USDT,0.01,40000,400,0,,,,,DATO INVENTADO,fixture\n` +
        `f9,2026-01-16,IOL,COMPRA,IBIT,ARS,40,1000,40000,0,,10,,,DATO INVENTADO,fixture\n`,
    });
    await volcar(prisma, dir);
    const base = await levantar();
    const respuesta = await fetch(`${base}/exposicion-btc`);
    expect(respuesta.status).toBe(200);
    const cuerpo = await respuesta.json();
    // Spot: 500. IBIT: 200. Otros: 150 + 225 + 125 = 500. Cartera: 1.200. BTC: 700 ÷ 1.200.
    expect(cuerpo).toMatchObject({ carteraUsd: "1200.00", porcentaje: "58.33", cantidadBtc: "0.01400000" });
    expect(cuerpo.partes[0]).toMatchObject({ etiqueta: "Spot", ubicacion: "Binance" });
    expect(cuerpo.partes[2]).toMatchObject({ etiqueta: "IBIT", ubicacion: "IOL" });
  });

  it("consulta el precio de Bitcoin aunque no haya BTC en spot", async () => {
    const dir = copiarFixtures({
      catalogo: (t) => `${t}BTC,Bitcoin inventado,CRIPTO,,CRIPTO,BTCUSDT,,,\n`,
    });
    await volcar(prisma, dir);
    const cuerpo = await (await fetch(`${await levantar()}/exposicion-btc`)).json();
    expect(cuerpo.precioBtcUsd).toBe("50000");
    expect(cuerpo.porcentaje).toBe("0.00");
  });

  it("si la base falla, la exposición también responde 503", async () => {
    const roto = {
      movimiento: { findMany: async () => { throw new Error("sin conexión"); } },
      activo: { findMany: async () => [] },
      precio: { findMany: async () => [] },
    };
    const respuesta = await fetch(`${await levantar(roto)}/exposicion-btc`);
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ mensaje: "No se pudo leer la base de datos" });
  });

  it("no necesita DATA_DIR: lee solo de la base", async () => {
    await volcar(prisma, FIXTURES);
    const anterior = process.env.DATA_DIR;
    delete process.env.DATA_DIR;
    try {
      const respuesta = await fetch(await levantar());
      expect((await respuesta.json()).totalUsd).toBe("500.00");
    } finally {
      if (anterior !== undefined) process.env.DATA_DIR = anterior;
    }
  });

  it("con la base vacía devuelve total 0 y ningún activo", async () => {
    const respuesta = await fetch(await levantar());
    expect(respuesta.status).toBe(200);
    expect(await respuesta.json()).toMatchObject({ totalUsd: "0.00", activos: [] });
  });

  it("si la base falla responde 503 con un mensaje claro", async () => {
    const roto = {
      movimiento: { findMany: async () => { throw new Error("sin conexión a credenciales-secretas"); } },
      activo: { findMany: async () => [] },
      precio: { findMany: async () => [] },
    };
    const respuesta = await fetch(await levantar(roto));
    expect(respuesta.status).toBe(503);
    expect(await respuesta.json()).toEqual({ mensaje: "No se pudo leer la base de datos" });
  });
});
