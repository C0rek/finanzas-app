// =====================================================================
// Seed: carga la base con DATOS DE PRUEBA inventados.
//
// Se corre con `pnpm db:seed` (desde la raíz del repo).
//
// Pasos:
//   1. Crea (o actualiza) el catálogo de cuentas y activos.
//   2. Lee prisma/datos-prueba/movimientos.csv.
//   3. Valida cada fila y la convierte al formato de la base.
//   4. Inserta todo en UNA transacción: o entran todas las filas o
//      ninguna. Así nunca queda la base a medio cargar.
//
// Por seguridad, si la tabla de movimientos ya tiene datos, no hace nada:
// nunca queremos mezclar datos de prueba con datos reales.
// =====================================================================
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import {
  Moneda,
  Prisma,
  TipoActivo,
  TipoCuenta,
  TipoMovimiento,
} from "../src/generated/prisma/client.js";
import { crearPrisma } from "../src/prisma.js";

const CUENTAS: { nombre: string; tipo: TipoCuenta }[] = [
  { nombre: "Bitunix", tipo: TipoCuenta.EXCHANGE },
  { nombre: "Bróker de prueba", tipo: TipoCuenta.BROKER },
  { nombre: "Cold wallet", tipo: TipoCuenta.WALLET },
];

const ACTIVOS: { simbolo: string; nombre: string; tipo: TipoActivo }[] = [
  { simbolo: "BTC", nombre: "Bitcoin", tipo: TipoActivo.CRIPTO },
  { simbolo: "ETH", nombre: "Ethereum", tipo: TipoActivo.CRIPTO },
  { simbolo: "USDT", nombre: "Tether", tipo: TipoActivo.STABLECOIN },
  { simbolo: "USD", nombre: "Dólar estadounidense", tipo: TipoActivo.FIAT },
  { simbolo: "IBIT", nombre: "iShares Bitcoin Trust (CEDEAR)", tipo: TipoActivo.CEDEAR },
];

const ARCHIVO_CSV = new URL("./datos-prueba/movimientos.csv", import.meta.url);

/** Una fila del CSV tal como viene: todo es texto. */
type FilaCsv = Record<
  | "fecha" | "tipo" | "activo" | "cantidad" | "precio" | "moneda" | "comision"
  | "comision_activo" | "cuenta" | "cuenta_destino" | "estrategia" | "nota",
  string
>;

// --- Helpers de validación -------------------------------------------

/** Convierte texto a Decimal exacto. Nunca pasa por `number` (float). */
function decimal(valor: string, campo: string): Prisma.Decimal {
  // Solo dígitos, signo opcional y punto decimal: rechaza "1,5", "1e3", "abc".
  if (!/^-?\d+(\.\d+)?$/.test(valor)) {
    throw new Error(`"${campo}" no es un número válido: "${valor}" (usá punto decimal, sin separador de miles)`);
  }
  return new Prisma.Decimal(valor);
}

function decimalOpcional(valor: string, campo: string): Prisma.Decimal | null {
  return valor === "" ? null : decimal(valor, campo);
}

function enumValor<T extends Record<string, string>>(enumObj: T, valor: string, campo: string): T[keyof T] {
  if (!Object.values(enumObj).includes(valor)) {
    throw new Error(`"${campo}" inválido: "${valor}". Opciones: ${Object.values(enumObj).join(", ")}`);
  }
  return valor as T[keyof T];
}

function fecha(valor: string): Date {
  // Exigimos zona horaria explícita (ej. -03:00) para que no haya dudas
  // de a qué hora real corresponde cada movimiento.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(valor)) {
    throw new Error(`"fecha" debe tener formato ISO con zona horaria, ej. 2025-01-31T10:00:00-03:00. Vino: "${valor}"`);
  }
  return new Date(valor);
}

function idDe(mapa: Map<string, number>, clave: string, campo: string): number {
  const id = mapa.get(clave);
  if (id === undefined) {
    throw new Error(`"${campo}" desconocido: "${clave}". Agregalo al catálogo en prisma/seed.ts`);
  }
  return id;
}

// --- Programa principal ----------------------------------------------

async function main() {
  const prisma = crearPrisma();
  try {
    // 1. Catálogo. `upsert` = "insertá si no existe, actualizá si existe".
    for (const c of CUENTAS) {
      await prisma.cuenta.upsert({ where: { nombre: c.nombre }, update: { tipo: c.tipo }, create: c });
    }
    for (const a of ACTIVOS) {
      await prisma.activo.upsert({ where: { simbolo: a.simbolo }, update: { nombre: a.nombre, tipo: a.tipo }, create: a });
    }

    // Guardia: no mezclar datos de prueba con datos existentes.
    const existentes = await prisma.movimiento.count();
    if (existentes > 0) {
      console.log(`La tabla ya tiene ${existentes} movimientos: no cargo datos de prueba.`);
      console.log("Para empezar de cero en desarrollo: pnpm db:reset");
      return;
    }

    // Mapas nombre -> id, para traducir lo que dice el CSV a claves foráneas.
    const cuentaId = new Map((await prisma.cuenta.findMany()).map((c) => [c.nombre, c.id]));
    const activoId = new Map((await prisma.activo.findMany()).map((a) => [a.simbolo, a.id]));

    // 2. Leer el CSV. `columns: true` usa la primera fila como encabezados.
    let filas: FilaCsv[];
    try {
      filas = parse(readFileSync(ARCHIVO_CSV, "utf8"), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      });
    } catch (e) {
      throw new Error(
        `No se pudo leer el CSV: ${(e as Error).message}\n` +
          `Pista: si una fila tiene más columnas de las esperadas, revisá que los decimales usen punto (0.01) y no coma (0,01).`,
      );
    }

    // 3. Validar y convertir. Juntamos TODOS los errores antes de cortar,
    //    así se corrige el CSV de una sola pasada.
    const datos: Prisma.MovimientoCreateManyInput[] = [];
    const errores: string[] = [];
    filas.forEach((f, i) => {
      const nroFila = i + 2; // +1 por el encabezado, +1 porque Excel cuenta desde 1
      try {
        const comision = decimalOpcional(f.comision, "comision");
        datos.push({
          fecha: fecha(f.fecha),
          tipo: enumValor(TipoMovimiento, f.tipo, "tipo"),
          activoId: idDe(activoId, f.activo, "activo"),
          cantidad: decimal(f.cantidad, "cantidad"),
          precio: decimalOpcional(f.precio, "precio"),
          moneda: enumValor(Moneda, f.moneda || "USD", "moneda"),
          comision,
          comisionActivoId: comision ? idDe(activoId, f.comision_activo, "comision_activo") : null,
          cuentaId: idDe(cuentaId, f.cuenta, "cuenta"),
          cuentaDestinoId: f.cuenta_destino ? idDe(cuentaId, f.cuenta_destino, "cuenta_destino") : null,
          estrategia: f.estrategia || null,
          nota: f.nota || null,
        });
      } catch (e) {
        errores.push(`Fila ${nroFila}: ${(e as Error).message}`);
      }
    });

    if (errores.length > 0) {
      throw new Error(`El CSV tiene ${errores.length} error(es):\n  ${errores.join("\n  ")}`);
    }

    // 4. Insertar todo junto. Si Postgres rechaza una fila (por ejemplo,
    //    rompe un CHECK), la transacción se deshace entera.
    const { count } = await prisma.$transaction(async (tx) => tx.movimiento.createMany({ data: datos }));
    console.log(`Listo: ${CUENTAS.length} cuentas, ${ACTIVOS.length} activos y ${count} movimientos de prueba.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
