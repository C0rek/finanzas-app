// Lee los movimientos de la base para la pantalla de Movimientos.
import type { PrismaClient } from "../generated/prisma/client.js";
import { armarMovimientos, type MovimientoApi } from "./armar-movimientos.js";

export class MovimientosService {
  constructor(private readonly prisma: PrismaClient) {}

  async listar(): Promise<MovimientoApi[]> {
    const filas = await this.prisma.movimiento.findMany({
      include: {
        activo: { select: { simbolo: true, grupo: true } },
        comisionActivo: { select: { simbolo: true } },
        activoPago: { select: { simbolo: true } },
        cuenta: { select: { nombre: true } },
        cuentaDestino: { select: { nombre: true } },
      },
    });
    return armarMovimientos(
      filas.map((m) => ({
        id: m.id,
        fecha: m.fecha,
        tipo: m.tipo,
        simbolo: m.activo.simbolo,
        grupo: m.activo.grupo,
        cantidad: m.cantidad.toString(),
        precio: m.precio?.toString() ?? null,
        total: m.total?.toString() ?? null,
        totalUsd: m.totalUsd?.toString() ?? null,
        moneda: m.moneda,
        cuenta: m.cuenta.nombre,
        cuentaDestino: m.cuentaDestino?.nombre ?? null,
        comision: m.comision?.toString() ?? null,
        simboloComision: m.comisionActivo?.simbolo ?? null,
        simboloPago: m.activoPago?.simbolo ?? null,
        idExterno: m.idExterno,
        nota: m.nota,
      })),
    );
  }
}
