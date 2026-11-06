// Volcado: pasa el historial y el catálogo de archivos a la base.
//
// Es la ÚNICA pieza que lee archivos. Se corre a mano; el servidor y el front
// solo leen de la base. Se puede repetir: cada movimiento se identifica por
// `idExterno`, así que una fila repetida actualiza en vez de duplicar.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Decimal } from "decimal.js";
import { parse } from "csv-parse/sync";
import { Moneda, TipoCuenta, TipoMovimiento, type PrismaClient } from "../generated/prisma/client.js";
import { leerCatalogo } from "./leer-catalogo.js";

const TIPO_CUENTA: Record<string, TipoCuenta> = {
  IOL: TipoCuenta.BROKER,
  BINANCE: TipoCuenta.EXCHANGE,
  BINGX: TipoCuenta.EXCHANGE,
  BITUNIX: TipoCuenta.EXCHANGE,
  BLOFIN: TipoCuenta.EXCHANGE,
  NEXO: TipoCuenta.EXCHANGE,
  LEMON: TipoCuenta.EXCHANGE,
};

// USDT se guarda como USD: en esta versión no distinguimos la moneda de pago dentro del dólar.
const MONEDA: Record<string, Moneda> = { ARS: Moneda.ARS, USD: Moneda.USD, USDT: Moneda.USD };
const TIPOS_SPOT = new Set<string>([TipoMovimiento.COMPRA, TipoMovimiento.VENTA, TipoMovimiento.AJUSTE]);

type FilaSpot = Record<
  | "id" | "fecha_utc" | "exchange" | "tipo" | "activo" | "moneda_pago" | "cantidad"
  | "precio_efectivo" | "comision" | "moneda_comision" | "nota",
  string
>;

type MovimientoNormalizado = {
  idExterno: string;
  fecha: Date;
  tipo: TipoMovimiento;
  simbolo: string;
  cantidad: string;
  precio: string | null;
  moneda: Moneda;
  comision: string | null;
  simboloComision: string | null;
  cuenta: string;
  nota: string | null;
};

export async function volcar(prisma: PrismaClient, dataDir: string): Promise<{ movimientos: number; activos: number }> {
  const conDatosDePrueba = await prisma.movimiento.count({ where: { idExterno: null } });
  if (conDatosDePrueba > 0) {
    throw new Error(
      `La base tiene ${conDatosDePrueba} movimientos que no vienen del volcado, probablemente datos de prueba. ` +
        "Para no mezclarlos con datos reales, primero dejá la base sin movimientos (en desarrollo: pnpm db:reset).",
    );
  }

  const catalogo = leerCatalogo(readFileSync(join(dataDir, "catalogo-activos.csv"), "utf8"));
  const principales = catalogo.filter((e) => !e.unificaEn);
  // Una especie unificada se guarda con el símbolo principal: así el motor no necesita el catálogo.
  const simboloFinal = new Map(catalogo.map((e) => [e.simbolo, e.unificaEn ?? e.simbolo]));

  const filas: FilaSpot[] = parse(readFileSync(join(dataDir, "historial", "spot.csv"), "utf8"), {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Validamos TODO antes de escribir, y juntamos los errores para corregirlos de una pasada.
  const errores: string[] = [];
  const movimientos: MovimientoNormalizado[] = [];
  filas.forEach((f, i) => {
    try {
      movimientos.push(normalizar(f, simboloFinal));
    } catch (e) {
      errores.push(`Fila ${i + 2} (${f.id}): ${(e as Error).message}`);
    }
  });
  if (errores.length > 0) throw new Error(`spot.csv tiene ${errores.length} error(es):\n${errores.join("\n")}`);

  // Transacción: o entra todo o no entra nada. El timeout se amplía porque son muchas filas.
  await prisma.$transaction(
    async (tx) => {
      const activoId = new Map<string, number>();
      for (const e of principales) {
        const datos = {
          nombre: e.nombre,
          tipo: e.tipo,
          ratio: e.ratio,
          fuentePrecio: e.fuentePrecio,
          simboloPrecio: e.simboloPrecio,
        };
        const activo = await tx.activo.upsert({
          where: { simbolo: e.simbolo },
          update: datos,
          create: { simbolo: e.simbolo, ...datos },
        });
        activoId.set(e.simbolo, activo.id);
        if (e.valorManual) {
          const precio = { precioUsd: e.valorManual.precioUsd, obtenidoEn: e.valorManual.fecha, origen: "MANUAL" as const };
          await tx.precio.upsert({ where: { activoId: activo.id }, update: precio, create: { activoId: activo.id, ...precio } });
        }
      }

      const cuentaId = new Map<string, number>();
      for (const nombre of new Set(movimientos.map((m) => m.cuenta))) {
        const tipo = TIPO_CUENTA[nombre]!;
        const cuenta = await tx.cuenta.upsert({ where: { nombre }, update: { tipo }, create: { nombre, tipo } });
        cuentaId.set(nombre, cuenta.id);
      }

      for (const m of movimientos) {
        const datos = {
          fecha: m.fecha,
          tipo: m.tipo,
          activoId: activoId.get(m.simbolo)!,
          cantidad: m.cantidad,
          precio: m.precio,
          moneda: m.moneda,
          comision: m.comision,
          comisionActivoId: m.simboloComision ? activoId.get(m.simboloComision)! : null,
          cuentaId: cuentaId.get(m.cuenta)!,
          nota: m.nota,
        };
        await tx.movimiento.upsert({
          where: { idExterno: m.idExterno },
          update: datos,
          create: { idExterno: m.idExterno, ...datos },
        });
      }
    },
    { timeout: 60_000 },
  );

  return { movimientos: movimientos.length, activos: principales.length };
}

function normalizar(f: FilaSpot, simboloFinal: Map<string, string>): MovimientoNormalizado {
  if (!TIPOS_SPOT.has(f.tipo)) throw new Error(`tipo inválido "${f.tipo}"`);
  if (!(f.exchange in TIPO_CUENTA)) throw new Error(`exchange desconocido "${f.exchange}"`);
  const moneda = MONEDA[f.moneda_pago];
  if (!moneda) throw new Error(`moneda de pago desconocida "${f.moneda_pago}"`);

  const simbolo = simboloFinal.get(f.activo);
  if (!simbolo) throw new Error(`activo fuera del catálogo "${f.activo}"`);

  const hayComision = f.comision !== "" && !decimal(f.comision, "comision").isZero();
  let simboloComision: string | null = null;
  if (hayComision) {
    simboloComision = simboloFinal.get(f.moneda_comision) ?? null;
    if (!simboloComision) throw new Error(`moneda de comisión fuera del catálogo "${f.moneda_comision}"`);
  }

  const esAjuste = f.tipo === TipoMovimiento.AJUSTE;
  return {
    idExterno: f.id,
    fecha: fecha(f.fecha_utc),
    tipo: f.tipo as TipoMovimiento,
    simbolo,
    cantidad: decimal(f.cantidad, "cantidad").toFixed(),
    precio: esAjuste ? null : decimal(f.precio_efectivo, "precio_efectivo").toFixed(),
    moneda,
    comision: hayComision ? decimal(f.comision, "comision").toFixed() : null,
    simboloComision,
    cuenta: f.exchange,
    nota: f.nota || null,
  };
}

function decimal(valor: string, campo: string): Decimal {
  try {
    return new Decimal(valor);
  } catch {
    throw new Error(`"${campo}" no es un número válido: "${valor}"`);
  }
}

function fecha(valor: string): Date {
  // Algunos exports (IOL) traen solo la fecha, sin hora.
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(valor) ? `${valor}T00:00:00Z` : valor;
  const d = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(iso) ? new Date(iso) : new Date(NaN);
  if (Number.isNaN(d.getTime())) throw new Error(`fecha inválida "${valor}"`);
  return d;
}
