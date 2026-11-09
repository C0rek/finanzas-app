// Prepara los movimientos de la base para la pantalla: signos, precio en USD e impacto.
import { Decimal } from "../decimal.js";
import { ordenarParaReproducir } from "../patrimonio/costos.js";
import { nombreLegible } from "../patrimonio/exposicion-btc.js";
import { efectosDe } from "../patrimonio/motor-posiciones.js";

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
  cuentaDestino?: string | null;
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
  p2p: boolean;
  activo: string;
  cantidad: string;
  moneda: "USD" | "ARS";
  precio: string | null;
  total: string | null;
  precioUsd: string | null;
  totalUsd: string | null;
  cuenta: string;
  cuentaDestino: string | null;
  mercado: null;
  pagadoCon: string | null;
  comision: { monto: string; activo: string } | null;
  origen: "IMPORTADO";
  idExterno: string | null;
  etiquetas: string[];
  impacto: { antes: string; despues: string } | null;
  // Cómo cambió el activo con que se pagó (ej.: USDT), si se sigue por SALDO en esa cuenta.
  impactoPago: { activo: string; antes: string; despues: string } | null;
  nota: string | null;
};

// Efecto de cada tipo en el saldo del activo.
const EFECTO: Record<string, 1 | -1> = { COMPRA: 1, AJUSTE: 1, VENTA: -1 };

export function armarMovimientos(filas: FilaMovimiento[]): MovimientoApi[] {
  // Mismas reglas que el motor de posiciones: saldo por activo Y cuenta, porque un SALDO
  // fija una sola cuenta. El impacto muestra el total del activo (todas las cuentas).
  const saldos = new Map<string, Decimal>();
  const totales = new Map<string, Decimal>();
  const seguidos = new Set<string>(); // activo y cuenta con un SALDO: desde ahí se sigue el activo de pago
  const clave = (simbolo: string, cuenta: string) => `${simbolo}\u0000${cuenta}`;
  const cero = new Decimal(0);
  // Cambia el saldo de una cuenta y devuelve el total del activo antes y después.
  const mover = (simbolo: string, cuenta: string, nuevo: (actual: Decimal) => Decimal) => {
    const k = clave(simbolo, cuenta);
    const actual = saldos.get(k) ?? cero;
    const siguiente = nuevo(actual);
    saldos.set(k, siguiente);
    const antes = totales.get(simbolo) ?? cero;
    const despues = antes.plus(siguiente.minus(actual));
    totales.set(simbolo, despues);
    return { antes, despues };
  };

  const armados = ordenarParaReproducir(filas).map((f): MovimientoApi => {
    const efecto = EFECTO[f.tipo];
    const cantidad = new Decimal(f.cantidad);
    let impacto: MovimientoApi["impacto"] = null;
    let impactoPago: MovimientoApi["impactoPago"] = null;
    if (f.tipo === "SALDO") {
      // Un SALDO no suma ni resta: fija la cantidad que hay en esa cuenta a esa fecha.
      const r = mover(f.simbolo, f.cuenta, () => cantidad);
      seguidos.add(clave(f.simbolo, f.cuenta));
      impacto = { antes: r.antes.toFixed(), despues: r.despues.toFixed() };
    } else {
      // Mismos efectos que el motor de posiciones. El impacto muestra el total del activo (todas las cuentas):
      // en una transferencia entre cuentas propias solo cambia por la comisión del camino.
      let antes: Decimal | null = null, despues: Decimal | null = null;
      for (const e of efectosDe(f, (s, c) => seguidos.has(clave(s, c)))) {
        const r = mover(e.simbolo, e.cuenta, (actual) => actual.plus(e.cambio));
        if (e.esPago) impactoPago = { activo: e.simbolo, antes: r.antes.toFixed(), despues: r.despues.toFixed() };
        else {
          antes ??= r.antes;
          despues = r.despues;
        }
      }
      const total = totales.get(f.simbolo) ?? cero;
      if (efecto || f.tipo === "TRANSFER" || f.tipo === "PNL_FUTUROS") impacto = { antes: (antes ?? total).toFixed(), despues: (despues ?? total).toFixed() };
    }

    // El total lleva el signo del efecto en tu caja: comprar resta, vender suma.
    const conSigno = (valor: string | null) => (valor === null || !efecto ? null : new Decimal(valor).times(-efecto).toFixed());

    return {
      id: f.id,
      fecha: f.fecha.toISOString(),
      tipo: f.tipo,
      p2p: f.idExterno?.startsWith("binance-p2p-") ?? false,
      activo: f.simbolo,
      cantidad: cantidad.toFixed(),
      moneda: f.moneda,
      precio: f.precio,
      total: conSigno(f.total),
      precioUsd: precioEnUsd(f, cantidad),
      totalUsd: conSigno(f.totalUsd),
      cuenta: nombreLegible(f.cuenta),
      cuentaDestino: f.cuentaDestino ? nombreLegible(f.cuentaDestino) : null,
      mercado: null,
      pagadoCon: f.simboloPago ?? null,
      comision: f.comision && f.simboloComision ? { monto: f.comision, activo: f.simboloComision } : null,
      origen: "IMPORTADO",
      idExterno: f.idExterno,
      etiquetas: [],
      impacto,
      impactoPago,
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
