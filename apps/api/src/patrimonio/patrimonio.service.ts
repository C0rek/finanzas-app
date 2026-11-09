// Une las piezas: lee de la base, calcula posiciones y las valoriza.
import type { PrismaClient } from "../generated/prisma/client.js";
import type { PreciosService } from "../precios/precios.service.js";
import type { ActivoValuable } from "../precios/proveedor-precios.js";
import { calcularPreciosPromedio, calcularResultadoRealizado } from "./costos.js";
import { armarPosiciones, type RespuestaPosiciones } from "./posiciones.js";
import {
  calcularExposicionBtc,
  cantidadesPorCuenta,
  SIMBOLO_BTC,
  ubicacionesPorActivo,
  type RespuestaExposicionBtc,
} from "./exposicion-btc.js";
import { calcularEvolucion, type RespuestaEvolucion } from "./evolucion.js";
import { calcularPosiciones } from "./motor-posiciones.js";
import type { CierresMensuales } from "../precios/binance.js";

const MESES_EVOLUCION = 12;
// Los cierres de meses pasados no cambian: con una consulta por hora alcanza.
const CACHE_CIERRES_MS = 60 * 60_000;
import { valuar, type RespuestaPatrimonio } from "./valuador.js";

export class PatrimonioService {
  private readonly cacheCierres = new Map<string, { hasta: number; cierres: Map<string, string> }>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly precios: PreciosService,
    // Sin proveedor de cierres (tests), las cripto de meses pasados se valúan a costo.
    private readonly cierresMensuales: CierresMensuales = async () => new Map(),
  ) {}

  async evolucion(): Promise<RespuestaEvolucion> {
    const { valuacion, movimientos } = await this.calcular();
    const filas = await this.prisma.activo.findMany({
      where: { simbolo: { in: [...new Set(movimientos.map((m) => m.simbolo))] } },
      include: { precio: true },
    });
    const activos: ActivoValuable[] = filas.map((a) => ({
      id: a.id,
      simbolo: a.simbolo,
      ratio: a.ratio?.toString() ?? null,
      fuentePrecio: a.fuentePrecio,
      simboloPrecio: a.simboloPrecio,
    }));

    const cierres = new Map<string, Map<string, string>>();
    for (const a of activos) {
      if (a.fuentePrecio === "CRIPTO" && a.simboloPrecio) cierres.set(a.simbolo, await this.cierresDe(a.simboloPrecio));
    }
    const manuales = new Map(
      filas.filter((a) => a.fuentePrecio === "MANUAL" && a.precio).map((a) => [a.simbolo, a.precio!.precioUsd.toString()]),
    );

    return calcularEvolucion({
      movimientos,
      activos,
      cierres,
      manuales,
      totalActualUsd: valuacion.totalUsd,
      ahora: new Date(valuacion.calculadoEn),
      cantidadMeses: MESES_EVOLUCION,
    });
  }

  private async cierresDe(simboloPrecio: string): Promise<Map<string, string>> {
    const enCache = this.cacheCierres.get(simboloPrecio);
    if (enCache && Date.now() < enCache.hasta) return enCache.cierres;
    let cierres = new Map<string, string>();
    try {
      cierres = await this.cierresMensuales(simboloPrecio, MESES_EVOLUCION);
    } catch (e) {
      // Sin cierres, ese activo se valúa a costo y la tarjeta lo aclara.
      console.warn(`Cierres mensuales de ${simboloPrecio}: ${(e as Error).message}`);
    }
    this.cacheCierres.set(simboloPrecio, { hasta: Date.now() + CACHE_CIERRES_MS, cierres });
    return cierres;
  }

  async consultar(): Promise<RespuestaPatrimonio> {
    return (await this.calcular()).valuacion;
  }

  async exposicionBtc(): Promise<RespuestaExposicionBtc> {
    const { valuacion, posiciones, activos, precios, ubicaciones } = await this.calcular();
    return calcularExposicionBtc({ valuacion, posiciones, activos, precios, ubicaciones });
  }

  async posiciones(): Promise<RespuestaPosiciones> {
    const { valuacion, posiciones, activos, precios, movimientos, tipos, grupos, cuentas } = await this.calcular();
    return armarPosiciones({
      valuacion,
      posiciones,
      activos,
      precios,
      tipos,
      grupos,
      cuentas,
      promedios: calcularPreciosPromedio(movimientos),
      realizados: calcularResultadoRealizado(movimientos),
      movimientosHasta: movimientos.reduce<Date | null>((max, m) => (!max || m.fecha > max ? m.fecha : max), null),
    });
  }

  private async calcular() {
    const filasMovimientos = await this.prisma.movimiento.findMany({
      select: {
        fecha: true,
        tipo: true,
        cantidad: true,
        totalUsd: true,
        total: true,
        comision: true,
        activo: { select: { simbolo: true } },
        activoPago: { select: { simbolo: true } },
        comisionActivo: { select: { simbolo: true } },
        cuenta: { select: { nombre: true } },
      },
    });
    const movimientos = filasMovimientos.map((m) => ({
      simbolo: m.activo.simbolo,
      fecha: m.fecha,
      tipo: m.tipo,
      cantidad: m.cantidad.toString(),
      totalUsd: m.totalUsd?.toString() ?? null,
      cuenta: m.cuenta.nombre,
      simboloPago: m.activoPago?.simbolo ?? null,
      total: m.total?.toString() ?? null,
      comision: m.comision?.toString() ?? null,
      simboloComision: m.comisionActivo?.simbolo ?? null,
    }));
    const { posiciones, saldosNegativos } = calcularPosiciones(movimientos);

    // Solo se piden precios de lo que tenés, para no gastar consultas en activos vendidos.
    // BTC va siempre: hace falta para expresar la exposición aunque no haya BTC en spot.
    const filasActivos = await this.prisma.activo.findMany({
      where: { simbolo: { in: [...posiciones.map((p) => p.simbolo), SIMBOLO_BTC] } },
    });
    const activos: ActivoValuable[] = filasActivos.map((a) => ({
      id: a.id,
      simbolo: a.simbolo,
      ratio: a.ratio?.toString() ?? null,
      fuentePrecio: a.fuentePrecio,
      simboloPrecio: a.simboloPrecio,
    }));

    const precios = await this.precios.vigentes(activos);
    const tipos = new Map<string, string>(filasActivos.map((a) => [a.simbolo, a.tipo]));
    const grupos = new Map<string, string>(filasActivos.map((a) => [a.simbolo, a.grupo]));
    const valuacion = valuar(posiciones, saldosNegativos, activos, precios, new Date(), grupos);

    // Dónde está cada activo (y cuánto en cada cuenta) según los movimientos, salvo que el
    // catálogo diga otra cosa (ej.: todo el BTC está en Bitunix, pero faltan las transferencias
    // que lo llevaron ahí). En ese caso todo lo que tenés va a esa cuenta.
    const cuentas = cantidadesPorCuenta(movimientos);
    for (const a of filasActivos) {
      const total = posiciones.find((p) => p.simbolo === a.simbolo)?.cantidad;
      if (a.ubicacion) cuentas.set(a.simbolo, total ? [{ cuenta: a.ubicacion, cantidad: total }] : []);
    }
    const ubicaciones = ubicacionesPorActivo(movimientos);
    for (const a of filasActivos) if (a.ubicacion) ubicaciones.set(a.simbolo, [a.ubicacion]);

    return { valuacion, posiciones, activos, precios, movimientos, tipos, grupos, cuentas, ubicaciones };
  }
}
