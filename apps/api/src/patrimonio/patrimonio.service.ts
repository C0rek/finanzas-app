// Une las piezas: lee de la base, calcula posiciones y las valoriza.
import type { PrismaClient } from "../generated/prisma/client.js";
import type { PreciosService } from "../precios/precios.service.js";
import type { ActivoValuable } from "../precios/proveedor-precios.js";
import {
  calcularExposicionBtc,
  SIMBOLO_BTC,
  ubicacionesPorActivo,
  type RespuestaExposicionBtc,
} from "./exposicion-btc.js";
import { calcularPosiciones } from "./motor-posiciones.js";
import { valuar, type RespuestaPatrimonio } from "./valuador.js";

export class PatrimonioService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly precios: PreciosService,
  ) {}

  async consultar(): Promise<RespuestaPatrimonio> {
    return (await this.calcular()).valuacion;
  }

  async exposicionBtc(): Promise<RespuestaExposicionBtc> {
    const { valuacion, posiciones, activos, precios, movimientos } = await this.calcular();
    return calcularExposicionBtc({
      valuacion,
      posiciones,
      activos,
      precios,
      ubicaciones: ubicacionesPorActivo(movimientos),
    });
  }

  private async calcular() {
    const filasMovimientos = await this.prisma.movimiento.findMany({
      select: {
        tipo: true,
        cantidad: true,
        activo: { select: { simbolo: true } },
        cuenta: { select: { nombre: true } },
      },
    });
    const movimientos = filasMovimientos.map((m) => ({
      simbolo: m.activo.simbolo,
      tipo: m.tipo,
      cantidad: m.cantidad.toString(),
      cuenta: m.cuenta.nombre,
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
    const valuacion = valuar(posiciones, saldosNegativos, activos, precios, new Date());
    return { valuacion, posiciones, activos, precios, movimientos };
  }
}
