// Tipos de los datos que muestra el Dashboard. Son la "forma" que va a devolver la API.

// Montos, cantidades y porcentajes viajan como texto ("18420.50"), nunca como number:
// un number de JavaScript es float y puede redondear mal. Para calcular se usa decimal.js.
export type DecimalTexto = string;

export interface ResumenDashboard {
  periodo: string; // "octubre 2026"
}

// Lo que devuelve GET /patrimonio.
export interface RespuestaPatrimonio {
  totalUsd: DecimalTexto;
  calculadoEn: string;
  parcial: true;
  // Cómo se reparte el total. La inversión (que incluye la liquidez) es la tabla de posiciones.
  desglose: { inversionUsd: DecimalTexto; liquidezUsd: DecimalTexto; colchonUsd: DecimalTexto };
  activos: {
    simbolo: string;
    grupo: 'POSICION' | 'LIQUIDEZ' | 'COLCHON';
    cantidad: DecimalTexto;
    precioUsd: DecimalTexto;
    valorUsd: DecimalTexto;
    origenPrecio: 'API' | 'MANUAL';
    precioDel: string;
  }[];
  avisos: {
    desactualizados: { simbolo: string; precioDel: string }[];
    sinValorizar: string[];
    saldosNegativos: string[];
  };
}

// Lo que devuelve GET /patrimonio/exposicion-btc.
export interface RespuestaExposicionBtc {
  calculadoEn: string;
  parcial: true;
  carteraUsd: DecimalTexto;
  precioBtcUsd: DecimalTexto | null; // null = no se pudo obtener
  porcentaje: DecimalTexto; // sobre la cartera de inversión
  cantidadBtc: DecimalTexto;
  valorUsd: DecimalTexto;
  partes: ParteExposicion[];
  resto: { porcentaje: DecimalTexto; detalle: string }; // lo que no es BTC
  avisos: {
    desactualizados: { simbolo: string; precioDel: string }[];
    sinValorizar: string[];
  };
}

export interface ParteExposicion {
  etiqueta: string; // "Spot", "IBIT"...
  porcentaje: DecimalTexto;
  cantidadBtc: DecimalTexto;
  ubicacion: string; // "Binance", "IOL", "No contemplado"...
}

// Lo que devuelve GET /patrimonio/evolucion.
export interface RespuestaEvolucion {
  calculadoEn: string;
  parcial: true;
  meses: { mes: string; valorUsd: DecimalTexto; actual: boolean }[]; // mes = "2026-10", del más viejo al actual
  aCosto: string[]; // en meses cerrados, valuados a lo que costaron (sin precio histórico)
  sinValorizar: string[]; // ni precio ni costo: no suman en esos meses
}

// --- Movimientos ---

// Los mismos valores que el enum TipoMovimiento de la base (apps/api/prisma/schema.prisma).
export type TipoMovimiento =
  | 'COMPRA'
  | 'VENTA'
  | 'TRANSFER'
  | 'PNL_FUTUROS'
  | 'REWARD'
  | 'APORTE'
  | 'COMISION'
  | 'AJUSTE'
  | 'SALDO';

export type OrigenMovimiento = 'API' | 'MANUAL' | 'IMPORTADO';

// Un movimiento tal como lo va a devolver la API para la pantalla.
// Los campos marcados "pendiente en la base" los pide el boceto pero el schema todavía no los tiene.
export interface Movimiento {
  id: number;
  fecha: string; // ISO 8601 con zona horaria: "2026-10-29T14:32:00-03:00"
  tipo: TipoMovimiento;
  p2p: boolean; // pendiente en la base
  activo: string; // símbolo: "BTC"
  // Siempre positiva y el tipo dice si suma o resta (misma convención que la base).
  // Única excepción: PNL_FUTUROS lleva signo.
  cantidad: DecimalTexto;
  moneda: 'USD' | 'ARS'; // en qué se pagó o cobró
  precio: DecimalTexto | null; // en `moneda`
  total: DecimalTexto | null; // en `moneda`, con signo
  precioUsd: DecimalTexto | null; // null si fue en pesos y no se conoce el valor en dólares
  totalUsd: DecimalTexto | null; // efecto en tu caja, con signo; null en transferencias
  cuenta: string; // en una transferencia, el origen
  cuentaDestino: string | null;
  mercado: string | null; // "spot", "futuros"... (pendiente en la base)
  pagadoCon: string | null; // activo con el que se pagó o cobró: "USDT"
  comision: { monto: DecimalTexto; activo: string } | null; // en el activo en que se cobró
  origen: OrigenMovimiento; // pendiente en la base
  idExterno: string | null; // ID del exchange (pendiente en la base)
  etiquetas: string[]; // estrategia y etiquetas del usuario (la base tiene un solo campo "estrategia")
  impacto: { antes: DecimalTexto; despues: DecimalTexto } | null; // posición del activo antes y después
  // Cómo cambió el activo con que se pagó (ej.: USDT de la liquidez). Falta si no se sigue.
  impactoPago?: { activo: string; antes: DecimalTexto; despues: DecimalTexto } | null;
  nota: string | null;
}

// Lo que devuelve GET /posiciones. null = no se conoce: la pantalla muestra una raya.
export interface Posicion {
  activo: string; // símbolo: "BTC", "SPY-TOK"
  cantidad: DecimalTexto;
  ubicacion: string;
  categoria: string;
  precioUsd: DecimalTexto | null; // precio de mercado por unidad (en un CEDEAR, del subyacente)
  precioPromedioUsd: DecimalTexto | null;
  valorUsd: DecimalTexto | null;
  noRealizadaUsd: DecimalTexto | null;
  noRealizadaPct: DecimalTexto | null; // resultado sobre lo que costó lo que tenés hoy
}

export interface RespuestaPosiciones {
  calculadoEn: string;
  movimientosHasta: string | null; // fecha del último movimiento cargado
  parcial: true;
  posiciones: Posicion[];
  // costoUsd: lo que costó lo que tenés, solo de las posiciones con precio promedio conocido.
  total: { valorUsd: DecimalTexto; noRealizadaUsd: DecimalTexto; costoUsd: DecimalTexto };
  avisos: {
    desactualizados: { simbolo: string; precioDel: string }[];
    sinValorizar: string[];
    sinPrecioPromedio: string[];
    saldosNegativos: string[];
  };
}
