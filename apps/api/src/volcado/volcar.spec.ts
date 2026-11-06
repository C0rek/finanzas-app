import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { copiarFixtures, FIXTURES, limpiarBase } from "../../test/ayudantes.js";
import { calcularPosiciones } from "../patrimonio/motor-posiciones.js";
import { crearPrisma } from "../prisma.js";
import { volcar } from "./volcar.js";

const prisma = crearPrisma();

beforeEach(() => limpiarBase(prisma));
afterAll(() => prisma.$disconnect());

describe("volcar", () => {
  it("crea los movimientos y los activos con sus datos de precio", async () => {
    const r = await volcar(prisma, FIXTURES);
    expect(r).toEqual({ movimientos: 7, activos: 7 });
    const cedear = await prisma.activo.findUniqueOrThrow({ where: { simbolo: "CEDEARX" } });
    expect(cedear.ratio?.toString()).toBe("10");
    expect(cedear.fuentePrecio).toBe("BOLSA");
    expect(cedear.simboloPrecio).toBe("CEDX");
  });

  it("guarda el valor manual como un precio con su fecha", async () => {
    await volcar(prisma, FIXTURES);
    const precio = await prisma.precio.findFirstOrThrow({ where: { activo: { simbolo: "FONDOX" } } });
    expect(precio.precioUsd.toString()).toBe("1.25");
    expect(precio.origen).toBe("MANUAL");
    // La fecha del catálogo es la de Argentina: si fuera medianoche UTC, se mostraría como el día anterior.
    expect(precio.obtenidoEn.toISOString()).toBe("2026-01-15T03:00:00.000Z");
  });

  it("convierte fecha, moneda, ajuste y comisión", async () => {
    await volcar(prisma, FIXTURES);
    const f1 = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f1" }, include: { comisionActivo: true } });
    expect(f1.moneda).toBe("USD");
    expect(f1.comision?.toString()).toBe("0.5");
    expect(f1.comisionActivo?.simbolo).toBe("USDT");
    const f2 = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f2" } });
    expect(f2.comision).toBeNull();
    expect(f2.comisionActivoId).toBeNull();
    const f3 = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f3" }, include: { cuenta: true } });
    expect(f3.fecha.toISOString()).toBe("2026-01-12T00:00:00.000Z");
    expect(f3.moneda).toBe("ARS");
    expect(f3.cuenta.tipo).toBe("BROKER");
    const f4 = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f4" } });
    expect(f4.tipo).toBe("AJUSTE");
    expect(f4.precio).toBeNull();
  });

  it("unifica las especies de un bono, que se cancelan en el motor", async () => {
    await volcar(prisma, FIXTURES);
    expect(await prisma.activo.findUnique({ where: { simbolo: "BONOXD" } })).toBeNull();
    const filas = await prisma.movimiento.findMany({ include: { activo: true } });
    const { posiciones } = calcularPosiciones(
      filas.map((m) => ({ simbolo: m.activo.simbolo, tipo: m.tipo, cantidad: m.cantidad.toString() })),
    );
    expect(posiciones.map((p) => [p.simbolo, p.cantidad.toString()])).toEqual([
      ["CEDEARX", "45"],
      ["CRIPTOX", "1.5"],
      ["FONDOX", "100"],
    ]);
  });

  it("repetirlo no duplica nada", async () => {
    await volcar(prisma, FIXTURES);
    await volcar(prisma, FIXTURES);
    expect(await prisma.movimiento.count()).toBe(7);
    expect(await prisma.activo.count()).toBe(7);
    expect(await prisma.precio.count()).toBe(1);
  });

  it("si cambia una fila del CSV, actualiza el movimiento", async () => {
    await volcar(prisma, FIXTURES);
    const dir = copiarFixtures({ spot: (t) => t.replace("CRIPTOX,USDT,2,", "CRIPTOX,USDT,3,") });
    await volcar(prisma, dir);
    const f1 = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f1" } });
    expect(f1.cantidad.toString()).toBe("3");
  });

  it("un símbolo fuera de catálogo corta el volcado y no escribe nada", async () => {
    const dir = copiarFixtures({ spot: (t) => t.replace(",COMPRA,FONDOX,", ",COMPRA,NOEXISTE,") });
    await expect(volcar(prisma, dir)).rejects.toThrow(/NOEXISTE/);
    expect(await prisma.movimiento.count()).toBe(0);
    expect(await prisma.activo.count()).toBe(0);
  });

  it("deshace todo si la base rechaza una fila", async () => {
    const dir = copiarFixtures({ spot: (t) => t.replace("COMPRA,FONDOX,ARS,100,", "COMPRA,FONDOX,ARS,0,") });
    await expect(volcar(prisma, dir)).rejects.toThrow();
    expect(await prisma.movimiento.count()).toBe(0);
    expect(await prisma.activo.count()).toBe(0);
  });

  it("informa todas las filas inválidas juntas", async () => {
    const dir = copiarFixtures({
      spot: (t) => t.replace(",COMPRA,FONDOX,", ",COMPRA,MAL1,").replace(",COMPRA,BONOX,", ",COMPRA,MAL2,"),
    });
    const error = await volcar(prisma, dir).catch((e: Error) => e.message);
    expect(error).toContain("MAL1");
    expect(error).toContain("MAL2");
  });

  it("no acepta un exchange desconocido", async () => {
    const dir = copiarFixtures({ spot: (t) => t.replace("12:00:00Z,BINANCE,COMPRA", "12:00:00Z,OTROEX,COMPRA") });
    await expect(volcar(prisma, dir)).rejects.toThrow(/OTROEX/);
  });

  it.each([
    ["un CEDEAR sin ratio", "CEDEAR,10,", "CEDEAR,,", /CEDEARX.*ratio/],
    ["un ratio 0", "CEDEAR,10,", "CEDEAR,0,", /CEDEARX.*ratio/],
    ["un MANUAL sin valor", "MANUAL,,,1.25,2026-01-15", "MANUAL,,,,", /FONDOX.*valor/],
    ["un CRIPTO sin símbolo de precio", "CRIPTO,CRIPTOXUSDT,", "CRIPTO,,", /CRIPTOX.*simbolo_precio/],
  ])("el catálogo rechaza %s", async (_nombre, antes, despues, mensaje) => {
    const dir = copiarFixtures({ catalogo: (t) => t.replace(antes, despues) });
    await expect(volcar(prisma, dir)).rejects.toThrow(mensaje);
  });

  it("acepta un CEDEAR sin ratio si no se valoriza", async () => {
    const dir = copiarFixtures({
      catalogo: (t) => `${t}OTROCEDEAR,CEDEAR sin saldo,CEDEAR,,,,,,\n`,
    });
    await expect(volcar(prisma, dir)).resolves.toMatchObject({ activos: 8 });
  });

  it("se niega a mezclar con datos de prueba", async () => {
    const cuenta = await prisma.cuenta.create({ data: { nombre: "Prueba", tipo: "EXCHANGE" } });
    const activo = await prisma.activo.create({ data: { simbolo: "TEST", nombre: "Test", tipo: "CRIPTO" } });
    await prisma.movimiento.create({
      data: { fecha: new Date(), tipo: "APORTE", activoId: activo.id, cantidad: "1", cuentaId: cuenta.id },
    });
    await expect(volcar(prisma, FIXTURES)).rejects.toThrow(/datos de prueba.*pnpm db:reset/s);
    expect(await prisma.movimiento.count()).toBe(1);
  });
});
