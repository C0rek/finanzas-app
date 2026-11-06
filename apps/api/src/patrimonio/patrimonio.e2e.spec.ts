import "reflect-metadata";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { FIXTURES, limpiarBase } from "../../test/ayudantes.js";
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
  CRIPTO: proveedorFalso({ CRIPTOXUSDT: "100" }),
  BOLSA: proveedorFalso({ CEDX: "50" }),
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
