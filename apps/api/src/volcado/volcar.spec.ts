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
    expect(r).toEqual({ movimientos: 7, activos: 7, ausentesEnCsv: [] });
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
    // Una fecha sin hora es de Argentina: en UTC se mostraría como el día anterior.
    expect(f3.fecha.toISOString()).toBe("2026-01-12T03:00:00.000Z");
    expect(f3.moneda).toBe("ARS");
    expect(f3.cuenta.tipo).toBe("BROKER");
    const f4 = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f4" } });
    expect(f4.tipo).toBe("AJUSTE");
    expect(f4.precio).toBeNull();
  });

  it("guarda el total y su valor en USD, sin inventarlo para los pesos", async () => {
    const dir = copiarFixtures({
      spot: (t) => `${t}f8,2026-01-16,IOL,COMPRA,CEDEARX,ARS,10,2000,20000,0,,10,1600,12.5,DATO INVENTADO,fixture\n`,
    });
    await volcar(prisma, dir);
    const dolares = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f1" } });
    expect(dolares.total?.toString()).toBe("200");
    expect(dolares.totalUsd?.toString()).toBe("200");
    const pesos = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f3" } });
    expect(pesos.total?.toString()).toBe("200000");
    expect(pesos.totalUsd).toBeNull();
    const pesosConUsd = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f8" } });
    expect(pesosConUsd.totalUsd?.toString()).toBe("12.5");
    const ajuste = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "f4" } });
    expect(ajuste.total).toBeNull();
    expect(ajuste.totalUsd).toBeNull();
  });

  it("guarda un SALDO sin precio ni total, y el activo con que se pagó cada compra o venta", async () => {
    const dir = copiarFixtures({
      spot: (t) => `${t}s1,2026-01-09T12:00:00Z,BINANCE,SALDO,USDT,USDT,1000,,,,,,,,DATO INVENTADO,fixture\n`,
    });
    await volcar(prisma, dir);
    const saldo = await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: "s1" } });
    expect(saldo.tipo).toBe("SALDO");
    expect(saldo.cantidad.toString()).toBe("1000");
    expect(saldo.precio).toBeNull();
    expect(saldo.total).toBeNull();
    expect(saldo.activoPagoId).toBeNull();

    const pago = async (id: string) =>
      (await prisma.movimiento.findUniqueOrThrow({ where: { idExterno: id }, include: { activoPago: true } })).activoPago?.simbolo ?? null;
    expect(await pago("f1")).toBe("USDT"); // compra
    expect(await pago("f2")).toBe("USDT"); // venta
    expect(await pago("f3")).toBe("ARS");
    expect(await pago("f4")).toBeNull(); // un AJUSTE no mueve el activo de pago
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

  it("rechaza un id repetido, en vez de perder un movimiento en silencio", async () => {
    const dir = copiarFixtures({ spot: (t) => t.replace("f2,2026-01-11", "f1,2026-01-11") });
    await expect(volcar(prisma, dir)).rejects.toThrow(/id repetido.*f1/);
    expect(await prisma.movimiento.count()).toBe(0);
  });

  it("rechaza un id vacío", async () => {
    const dir = copiarFixtures({ spot: (t) => t.replace("f2,2026-01-11", ",2026-01-11") });
    await expect(volcar(prisma, dir)).rejects.toThrow(/id vacío/);
    expect(await prisma.movimiento.count()).toBe(0);
  });

  it("informa los movimientos que ya no están en el CSV, sin borrarlos", async () => {
    await volcar(prisma, FIXTURES);
    const dir = copiarFixtures({ spot: (t) => t.split("\n").filter((l) => !l.startsWith("f5,")).join("\n") });
    const r = await volcar(prisma, dir);
    expect(r.ausentesEnCsv).toEqual(["f5"]);
    expect(await prisma.movimiento.count()).toBe(7);
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

  // Agrega la columna grupo al catálogo de prueba: vacía salvo en los símbolos indicados.
  const conGrupos = (grupos: Record<string, string>) => (t: string) =>
    t
      .split("\n")
      .map((linea, i) => (i === 0 ? `${linea},grupo` : linea ? `${linea},${grupos[linea.split(",")[0]!] ?? ""}` : linea))
      .join("\n");

  it("guarda el grupo del catálogo; el que no lo tiene es una posición", async () => {
    const dir = copiarFixtures({ catalogo: conGrupos({ FONDOX: "COLCHON", USDT: "LIQUIDEZ" }) });
    await volcar(prisma, dir);
    const grupos = Object.fromEntries((await prisma.activo.findMany()).map((a) => [a.simbolo, a.grupo]));
    expect(grupos).toMatchObject({ FONDOX: "COLCHON", USDT: "LIQUIDEZ", CRIPTOX: "POSICION" });
  });

  it("el catálogo rechaza un grupo inválido", async () => {
    const dir = copiarFixtures({ catalogo: conGrupos({ FONDOX: "OTRO" }) });
    await expect(volcar(prisma, dir)).rejects.toThrow(/FONDOX.*grupo/);
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
    const mensaje = await volcar(prisma, FIXTURES).catch((e: Error) => e.message);
    expect(mensaje).toContain("datos de prueba");
    // No debe recomendar un comando que borraría también datos reales.
    expect(mensaje).not.toContain("db:reset");
    expect(await prisma.movimiento.count()).toBe(1);
  });
});
