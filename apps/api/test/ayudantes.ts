// Ayudantes de los tests. Solo se usan contra la base terminada en _test.
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type { PrismaClient } from "../src/generated/prisma/client.js";

export const FIXTURES = fileURLToPath(new URL("./fixtures", import.meta.url));

export async function limpiarBase(prisma: PrismaClient): Promise<void> {
  await prisma.precio.deleteMany();
  await prisma.movimiento.deleteMany();
  await prisma.activo.deleteMany();
  await prisma.cuenta.deleteMany();
}

/** Copia los fixtures a una carpeta temporal y deja modificarlos. */
export function copiarFixtures(cambios: { spot?: (t: string) => string; catalogo?: (t: string) => string } = {}): string {
  const dir = mkdtempSync(join(tmpdir(), "finanzas-fixtures-"));
  cpSync(FIXTURES, dir, { recursive: true });
  const aplicar = (ruta: string, cambio?: (t: string) => string) => {
    if (cambio) writeFileSync(ruta, cambio(readFileSync(ruta, "utf8")));
  };
  aplicar(join(dir, "historial", "spot.csv"), cambios.spot);
  aplicar(join(dir, "catalogo-activos.csv"), cambios.catalogo);
  return dir;
}
