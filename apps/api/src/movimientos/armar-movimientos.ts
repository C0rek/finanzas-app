// Prepara los movimientos de la base para la pantalla: signos, precio en USD e impacto.
import { Decimal } from "../decimal.js";
import { ordenarParaReproducir } from "../patrimonio/costos.js";
import { nombreLegible } from "../patrimonio/exposicion-btc.js";

export type FilaMovimiento = {
  id: number;
  fecha: Date;
  tipo: string;
  simbolo: string;
  cantidad: string;
  precio: string | null;
  total: string | null;
  totalUsd: string | null;
  moneda: "USD" | "ARS";
  cuenta: string;
  comision: string | null;
  simboloComision: string | null;
  simboloPago?: string | null;
  idExterno: string | null;
  nota: string | null;
};

export type MovimientoApi = {
  id: number;
  fecha: string;
  tipo: string;
  p2p: false;
  activo: string;
  cantidad: string;
  moneda: "USD" | "ARS";
  precio: string | null;
  total: string | null;
  precioUsd: string | null;
  totalUsd: string | null;
  cuenta: string;
  cuentaDestino: null;
  mercado: null;
  pagadoCon: string | null;
  comision: { monto: string; activo: string } | null;
  origen: "IMPORTADO";
  idExterno: string | null;
  etiquetas: string[];
  impacto: { antes: string; despues: string } | null;
  nota: string | null;
};

// Efecto de cada tipo en el saldo del activo.
const EFECTO: Record<string, 1 | -1> = { COMPRA: 1, AJUSTE: 1, VENTA: -1 };

export function armarMovimientos(filas: FilaMovimiento[]): MovimientoApi[] {
  const saldos = new Map<string, Decimal>();
  const armados = ordenarParaReproducir(filas).map((f): MovimientoApi => {
    const efecto = EFECTO[f.tipo];
    const cantidad = new Decimal(f.cantidad);
    const antes = saldos.get(f.simbolo) ?? new Decimal(0);
    // Un SALDO no suma ni resta: fija la cantidad que hay a esa fecha.
    const despues = f.tipo === "SALDO" ? cantidad : efecto ? antes.plus(cantidad.times(efecto)) : antes;
    saldos.set(f.simbolo, despues);

    // El total lleva el signo del efecto en tu caja: comprar resta, vender suma.
    const conSigno = (valor: string | null) => (valor === null || !efecto ? null : new Decimal(valor).times(-efecto).toFixed());

    return {
      id: f.id,
      fecha: f.fecha.toISOString(),
      tipo: f.tipo,
      p2p: false,
      activo: f.simbolo,
      cantidad: cantidad.toFixed(),
      moneda: f.moneda,
      precio: f.precio,
      total: conSigno(f.total),
      precioUsd: precioEnUsd(f, cantidad),
      totalUsd: conSigno(f.totalUsd),
      cuenta: nombreLegible(f.cuenta),
      cuentaDestino: null,
      mercado: null,
      pagadoCon: f.simboloPago ?? null,
      comision: f.comision && f.simboloComision ? { monto: f.comision, activo: f.simboloComision } : null,
      origen: "IMPORTADO",
      idExterno: f.idExterno,
      etiquetas: [],
      impacto: efecto || f.tipo === "SALDO" ? { antes: antes.toFixed(), despues: despues.toFixed() } : null,
      nota: f.nota,
    };
  });
  return armados.reverse();
}

function precioEnUsd(f: FilaMovimiento, cantidad: Decimal): string | null {
  if (f.moneda === "USD") return f.precio;
  // En pesos solo hay precio en USD si se conoce el total en USD: no se inventa un tipo de cambio.
  return f.totalUsd === null ? null : new Decimal(f.totalUsd).dividedBy(cantidad).toFixed();
}
