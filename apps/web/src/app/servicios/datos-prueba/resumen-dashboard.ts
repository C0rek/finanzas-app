import { ResumenDashboard } from '../modelos';

// ⚠️ DATOS DE PRUEBA INVENTADOS (los mismos del boceto de Pencil). No son datos reales.
export const RESUMEN_DASHBOARD_PRUEBA: ResumenDashboard = {
  periodo: 'octubre 2026',
  estadoSincronizacion:
    'Bitunix sincronizado hace 12 min · BingX y Binance hace 2 días · datos de prueba',
  precioBtcUsd: '69800',
  patrimonio: {
    totalUsd: '18420',
    carteraInversionUsd: '14920',
    bienesYFiatUsd: '3500',
  },
  exposicionBtc: {
    porcentaje: '58.0',
    cantidadBtc: '0.1240',
    valorUsd: '8655',
    partes: [
      { etiqueta: 'Spot', porcentaje: '33.2', cantidadBtc: '0.071', ubicacion: 'Bitunix' },
      { etiqueta: 'Futuros (margen)', porcentaje: '8.4', cantidadBtc: '0.018', ubicacion: 'Bitunix' },
      { etiqueta: 'IBIT', porcentaje: '9.4', cantidadBtc: '0.020', ubicacion: 'Bróker' },
      { etiqueta: 'Cold wallet', porcentaje: '7.0', cantidadBtc: '0.015', ubicacion: 'Ledger' },
    ],
    resto: { porcentaje: '42.0', detalle: 'ETH, SOL y stables' },
  },
  resultado: {
    periodo: 'Octubre',
    noRealizadaUsd: '1135',
    noRealizadaPorcentaje: '8.2',
    realizadaUsd: '312',
    ventasCerradas: 3,
  },
  evolucion: {
    escalaMaximaUsd: '20000',
    meses: [
      { mes: 'Nov', valorUsd: '11200' },
      { mes: 'Dic', valorUsd: '11920' },
      { mes: 'Ene', valorUsd: '12640' },
      { mes: 'Feb', valorUsd: '12080' },
      { mes: 'Mar', valorUsd: '13440' },
      { mes: 'Abr', valorUsd: '14240' },
      { mes: 'May', valorUsd: '13840' },
      { mes: 'Jun', valorUsd: '15120' },
      { mes: 'Jul', valorUsd: '15920' },
      { mes: 'Ago', valorUsd: '15200' },
      { mes: 'Sep', valorUsd: '17120' },
      { mes: 'Oct', valorUsd: '18420' },
    ],
  },
  posiciones: [
    { activo: 'BTC', ubicacion: 'Bitunix · Cold wallet', categoria: 'BigCaps', precioPromedioUsd: '61200', valorUsd: '6003', noRealizadaUsd: '740' },
    { activo: 'BTC futuros', ubicacion: 'Bitunix · margen', categoria: 'BigCaps', precioPromedioUsd: '68900', valorUsd: '1256', noRealizadaUsd: '45' },
    { activo: 'IBIT', ubicacion: 'Bróker', categoria: 'CEDEARs', precioPromedioUsd: '34.10', valorUsd: '1396', noRealizadaUsd: '210' },
    { activo: 'ETH', ubicacion: 'Binance', categoria: 'BigCaps', precioPromedioUsd: '3100', valorUsd: '1410', noRealizadaUsd: '-95' },
    { activo: 'SOL', ubicacion: 'BingX', categoria: 'Alts', precioPromedioUsd: '152', valorUsd: '980', noRealizadaUsd: '235' },
    { activo: 'USDT', ubicacion: 'Bitunix · BingX', categoria: 'Stables', precioPromedioUsd: '1', valorUsd: '3875', noRealizadaUsd: '0' },
  ],
  totalPosiciones: { valorUsd: '14920', noRealizadaUsd: '1135' },
};
