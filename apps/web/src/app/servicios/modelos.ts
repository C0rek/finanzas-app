// Tipos de los datos que muestra el Dashboard. Son la "forma" que va a devolver la API.

// Montos, cantidades y porcentajes viajan como texto ("18420.50"), nunca como number:
// un number de JavaScript es float y puede redondear mal. Para calcular se usa decimal.js.
export type DecimalTexto = string;

export interface ResumenDashboard {
  periodo: string; // "octubre 2026"
  estadoSincronizacion: string;
  precioBtcUsd: DecimalTexto;
  patrimonio: Patrimonio;
  exposicionBtc: ExposicionBtc;
  resultado: Resultado;
  evolucion: EvolucionPatrimonio;
  posiciones: Posicion[];
  totalPosiciones: { valorUsd: DecimalTexto; noRealizadaUsd: DecimalTexto };
}

export interface Patrimonio {
  totalUsd: DecimalTexto;
  carteraInversionUsd: DecimalTexto;
  bienesYFiatUsd: DecimalTexto;
}

export interface ExposicionBtc {
  porcentaje: DecimalTexto; // sobre la cartera de inversión
  cantidadBtc: DecimalTexto;
  valorUsd: DecimalTexto;
  partes: ParteExposicion[];
  resto: { porcentaje: DecimalTexto; detalle: string }; // lo que no es BTC
}

export interface ParteExposicion {
  etiqueta: string; // "Spot", "IBIT"...
  porcentaje: DecimalTexto;
  cantidadBtc: DecimalTexto;
  ubicacion: string; // "Bitunix", "Bróker"...
}

export interface Resultado {
  periodo: string; // "Octubre"
  noRealizadaUsd: DecimalTexto;
  noRealizadaPorcentaje: DecimalTexto; // sobre el costo
  realizadaUsd: DecimalTexto;
  ventasCerradas: number; // es un conteo, no un monto: acá number está bien
}

export interface EvolucionPatrimonio {
  escalaMaximaUsd: DecimalTexto; // tope del eje vertical
  meses: { mes: string; valorUsd: DecimalTexto }[]; // del más viejo al más nuevo
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
  | 'COMISION';

export type OrigenMovimiento = 'API' | 'MANUAL';

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
  precioUsd: DecimalTexto | null;
  totalUsd: DecimalTexto | null; // efecto en tu caja, con signo; null en transferencias
  cuenta: string; // en una transferencia, el origen
  cuentaDestino: string | null;
  mercado: string | null; // "spot", "futuros"... (pendiente en la base)
  pagadoCon: string | null; // activo con el que se pagó o cobró: "USDT"
  comision: { montoUsd: DecimalTexto; porcentaje: DecimalTexto } | null;
  origen: OrigenMovimiento; // pendiente en la base
  idExterno: string | null; // ID del exchange (pendiente en la base)
  etiquetas: string[]; // estrategia y etiquetas del usuario (la base tiene un solo campo "estrategia")
  impacto: { antes: DecimalTexto; despues: DecimalTexto } | null; // posición del activo antes y después
  nota: string | null;
}

export interface Posicion {
  activo: string;
  ubicacion: string;
  categoria: string;
  precioPromedioUsd: DecimalTexto;
  valorUsd: DecimalTexto;
  noRealizadaUsd: DecimalTexto;
}
