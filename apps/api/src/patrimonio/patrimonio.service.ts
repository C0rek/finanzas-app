// Une las piezas: lee de la base, calcula posiciones y las valoriza.
import type { PrismaClient } from "../generated/prisma/client.js";
import type { PreciosService } from "../precios/precios.service.js";
import type { ActivoValuable } from "../precios/proveedor-precios.js";
import { calcularPosiciones } from "./motor-posiciones.js";
import { valuar, type RespuestaPatrimonio } from "./valuador.js";

export class PatrimonioService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly precios: PreciosService,
  ) {}

  async consultar(): Promise<RespuestaPatrimonio> {
    const movimientos = await this.prisma.movimiento.findMany({
      select: { tipo: true, cantidad: true, activo: { select: { simbolo: true } } },
    });
    const { posiciones, saldosNegativos } = calcularPosiciones(
      movimientos.map((m) => ({ simbolo: m.activo.simbolo, tipo: m.tipo, cantidad: m.cantidad.toString() })),
    );

    // Solo se piden precios de lo que tenés: no gastamos consultas en activos vendidos.
    const filas = await this.prisma.activo.findMany({
      where: { simbolo: { in: posiciones.map((p) => p.simbolo) } },
    });
    const activos: ActivoValuable[] = filas.map((a) => ({
      id: a.id,
      simbolo: a.simbolo,
      ratio: a.ratio?.toString() ?? null,
      fuentePrecio: a.fuentePrecio,
      simboloPrecio: a.simboloPrecio,
    }));

    return valuar(posiciones, saldosNegativos, activos, await this.precios.vigentes(activos), new Date());
  }
}
