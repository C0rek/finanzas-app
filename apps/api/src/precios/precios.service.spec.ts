import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { limpiarBase } from "../../test/ayudantes.js";
import { crearPrisma } from "../prisma.js";
import { PreciosService } from "./precios.service.js";
import type { ActivoValuable, PrecioObtenido, ProveedorPrecios } from "./proveedor-precios.js";

const prisma = crearPrisma();
const T0 = new Date("2026-03-01T12:00:00.000Z");

class ProveedorFalso implements ProveedorPrecios {
  llamadas = 0;
  constructor(public precios: Map<string, PrecioObtenido> | "caido") {}
  async obtener(): Promise<Map<string, PrecioObtenido>> {
    this.llamadas++;
    if (this.precios === "caido") throw new Error("caído");
    return this.precios;
  }
}

const conPrecio = (simbolo: string, precioUsd: string) => new Map([[simbolo, { precioUsd, del: T0 }]]);

async function crearActivo(simbolo: string, fuentePrecio: "CRIPTO" | "BOLSA" | "MANUAL"): Promise<ActivoValuable> {
  const a = await prisma.activo.create({
    data: { simbolo, nombre: simbolo, tipo: "CRIPTO", fuentePrecio, simboloPrecio: `${simbolo}P` },
  });
  return { id: a.id, simbolo, ratio: null, fuentePrecio, simboloPrecio: `${simbolo}P` };
}

beforeEach(() => limpiarBase(prisma));
afterAll(() => prisma.$disconnect());

describe("PreciosService", () => {
  it("un precio obtenido se devuelve fresco y queda guardado", async () => {
    const activo = await crearActivo("AAA", "CRIPTO");
    const servicio = new PreciosService(prisma, { CRIPTO: new ProveedorFalso(conPrecio("AAAP", "100.5")), BOLSA: new ProveedorFalso(new Map()) }, () => T0);
    const vigente = (await servicio.vigentes([activo])).get("AAA")!;
    expect(vigente).toEqual({ precioUsd: "100.5", del: T0, origen: "API", desactualizado: false });
    const guardado = await prisma.precio.findUniqueOrThrow({ where: { activoId: activo.id } });
    expect(guardado.precioUsd.toString()).toBe("100.5");
    expect(guardado.origen).toBe("API");
  });

  it("usa el caché durante 60 segundos y después vuelve a consultar", async () => {
    const activo = await crearActivo("AAA", "CRIPTO");
    const cripto = new ProveedorFalso(conPrecio("AAAP", "1"));
    let ahora = T0;
    const servicio = new PreciosService(prisma, { CRIPTO: cripto, BOLSA: new ProveedorFalso(new Map()) }, () => ahora);
    await servicio.vigentes([activo]);
    ahora = new Date(T0.getTime() + 59_000);
    await servicio.vigentes([activo]);
    expect(cripto.llamadas).toBe(1);
    ahora = new Date(T0.getTime() + 61_000);
    await servicio.vigentes([activo]);
    expect(cripto.llamadas).toBe(2);
  });

  it("con el proveedor caído usa el último precio guardado y lo marca", async () => {
    const activo = await crearActivo("AAA", "CRIPTO");
    const antes = new Date("2026-02-01T00:00:00.000Z");
    await prisma.precio.create({ data: { activoId: activo.id, precioUsd: "90", obtenidoEn: antes, origen: "API" } });
    const servicio = new PreciosService(prisma, { CRIPTO: new ProveedorFalso("caido"), BOLSA: new ProveedorFalso(new Map()) }, () => T0);
    expect((await servicio.vigentes([activo])).get("AAA")).toEqual({ precioUsd: "90", del: antes, origen: "API", desactualizado: true });
  });

  it("si el proveedor no devuelve el activo, también usa el guardado", async () => {
    const activo = await crearActivo("AAA", "CRIPTO");
    await prisma.precio.create({ data: { activoId: activo.id, precioUsd: "90", obtenidoEn: T0, origen: "API" } });
    const servicio = new PreciosService(prisma, { CRIPTO: new ProveedorFalso(new Map()), BOLSA: new ProveedorFalso(new Map()) }, () => T0);
    expect((await servicio.vigentes([activo])).get("AAA")!.desactualizado).toBe(true);
  });

  it("con el proveedor caído y sin precio guardado, el activo queda ausente", async () => {
    const activo = await crearActivo("AAA", "CRIPTO");
    const servicio = new PreciosService(prisma, { CRIPTO: new ProveedorFalso("caido"), BOLSA: new ProveedorFalso(new Map()) }, () => T0);
    expect((await servicio.vigentes([activo])).has("AAA")).toBe(false);
  });

  it("si falla cripto, los activos de bolsa siguen frescos", async () => {
    const a = await crearActivo("AAA", "CRIPTO");
    const b = await crearActivo("BBB", "BOLSA");
    const servicio = new PreciosService(prisma, { CRIPTO: new ProveedorFalso("caido"), BOLSA: new ProveedorFalso(conPrecio("BBBP", "7")) }, () => T0);
    const vigentes = await servicio.vigentes([a, b]);
    expect(vigentes.has("AAA")).toBe(false);
    expect(vigentes.get("BBB")!.desactualizado).toBe(false);
  });

  it("un activo manual no consulta proveedores y conserva la fecha de su valor", async () => {
    const activo = await crearActivo("FFF", "MANUAL");
    const fecha = new Date("2026-01-15T00:00:00.000Z");
    await prisma.precio.create({ data: { activoId: activo.id, precioUsd: "1.25", obtenidoEn: fecha, origen: "MANUAL" } });
    const cripto = new ProveedorFalso(new Map());
    const bolsa = new ProveedorFalso(new Map());
    const servicio = new PreciosService(prisma, { CRIPTO: cripto, BOLSA: bolsa }, () => T0);
    expect((await servicio.vigentes([activo])).get("FFF")).toEqual({ precioUsd: "1.25", del: fecha, origen: "MANUAL", desactualizado: false });
    expect(cripto.llamadas + bolsa.llamadas).toBe(0);
  });

  it("un valor manual no se pisa con el guardado de un precio de API", async () => {
    const manual = await crearActivo("FFF", "MANUAL");
    await prisma.precio.create({ data: { activoId: manual.id, precioUsd: "1.25", obtenidoEn: T0, origen: "MANUAL" } });
    const servicio = new PreciosService(prisma, { CRIPTO: new ProveedorFalso(conPrecio("FFFP", "999")), BOLSA: new ProveedorFalso(new Map()) }, () => T0);
    await servicio.vigentes([manual]);
    expect((await prisma.precio.findUniqueOrThrow({ where: { activoId: manual.id } })).precioUsd.toString()).toBe("1.25");
  });
});
