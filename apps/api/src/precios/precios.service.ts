// Decide qué precio usar para cada activo: en vivo, guardado o manual.
import type { PrismaClient } from "../generated/prisma/client.js";
import type { ActivoValuable, PrecioObtenido, PrecioVigente, ProveedorPrecios } from "./proveedor-precios.js";

// Caché corto: varias consultas seguidas no gastan el límite de los proveedores.
const CACHE_MS = 60_000;

type FuenteConProveedor = "CRIPTO" | "BOLSA";
type EntradaCache = { hasta: number; simbolos: Set<string>; precios: Map<string, PrecioObtenido> };

export class PreciosService {
  private readonly cache = new Map<FuenteConProveedor, EntradaCache>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly proveedores: Record<FuenteConProveedor, ProveedorPrecios>,
    private readonly ahora: () => Date = () => new Date(),
  ) {}

  async vigentes(activos: ActivoValuable[]): Promise<Map<string, PrecioVigente>> {
    const vigentes = new Map<string, PrecioVigente>();
    const guardados = await this.prisma.precio.findMany({ where: { activoId: { in: activos.map((a) => a.id) } } });
    const guardadoDe = new Map(guardados.map((p) => [p.activoId, p]));

    const usarGuardado = (activo: ActivoValuable, desactualizado: boolean) => {
      const guardado = guardadoDe.get(activo.id);
      if (!guardado) return;
      vigentes.set(activo.simbolo, {
        precioUsd: guardado.precioUsd.toString(),
        del: guardado.obtenidoEn,
        origen: guardado.origen,
        desactualizado,
      });
    };

    for (const activo of activos) {
      if (activo.fuentePrecio === "MANUAL") usarGuardado(activo, false);
    }

    // Cada proveedor se consulta por separado: si se cae uno, el otro sigue funcionando.
    for (const fuente of ["CRIPTO", "BOLSA"] as const) {
      const delGrupo = activos.filter((a) => a.fuentePrecio === fuente && a.simboloPrecio);
      if (delGrupo.length === 0) continue;
      const { precios, nuevo } = await this.consultar(fuente, delGrupo.map((a) => a.simboloPrecio!));

      for (const activo of delGrupo) {
        const precio = precios.get(activo.simboloPrecio!);
        if (!precio) {
          usarGuardado(activo, true);
          continue;
        }
        vigentes.set(activo.simbolo, { ...precio, origen: "API", desactualizado: false });
        // Solo se guarda lo recién obtenido, para tenerlo si el proveedor se cae después.
        if (nuevo) {
          const datos = { precioUsd: precio.precioUsd, obtenidoEn: precio.del, origen: "API" as const };
          await this.prisma.precio.upsert({ where: { activoId: activo.id }, update: datos, create: { activoId: activo.id, ...datos } });
        }
      }
    }
    return vigentes;
  }

  private async consultar(fuente: FuenteConProveedor, simbolos: string[]): Promise<{ precios: Map<string, PrecioObtenido>; nuevo: boolean }> {
    const momento = this.ahora().getTime();
    const enCache = this.cache.get(fuente);
    if (enCache && momento < enCache.hasta && simbolos.every((s) => enCache.simbolos.has(s))) {
      return { precios: enCache.precios, nuevo: false };
    }

    let precios = new Map<string, PrecioObtenido>();
    try {
      precios = await this.proveedores[fuente].obtener(simbolos);
    } catch (e) {
      // No corta la consulta: el usuario ve el último precio guardado y un aviso.
      console.warn(`Proveedor ${fuente} caído: ${(e as Error).message}`);
    }
    // También se cachea la falla, para no esperar el timeout en cada consulta.
    this.cache.set(fuente, { hasta: momento + CACHE_MS, simbolos: new Set(simbolos), precios });
    return { precios, nuevo: true };
  }
}
