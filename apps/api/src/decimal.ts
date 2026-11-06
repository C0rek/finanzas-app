// Decimal con precisión suficiente para las columnas Decimal(36, 18) de la base.
// decimal.js redondea a 20 dígitos por defecto: una cuenta con 18 decimales podía
// dejar saldos fantasma. Todo cálculo de montos usa esta instancia.
import { Decimal as DecimalBase } from "decimal.js";

export const Decimal = DecimalBase.clone({ precision: 60 });
export type Decimal = DecimalBase;
