// Fechas siempre en hora de Argentina, sin importar la zona de la computadora.
const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

export type FormatoFecha = 'corta' | 'hora' | 'completa' | 'mes';

// Intl arma "29 de oct de 2026"; para el formato del boceto ("29 oct 2026") lo armamos por partes.
function partes(iso: string, opciones: Intl.DateTimeFormatOptions): Record<string, string> {
  const formateador = new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HORARIA, ...opciones });
  return Object.fromEntries(formateador.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
}

//   'corta'    → "29 oct"
//   'hora'     → "14:32"
//   'completa' → "29 oct 2026, 14:32 (UTC−3)"
//   'mes'      → "Octubre 2026"
export function formatearFecha(iso: string, formato: FormatoFecha): string {
  const p = partes(iso, {
    day: 'numeric',
    month: formato === 'mes' ? 'long' : 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZoneName: 'shortOffset', // "GMT-3"
  });
  const hora = `${p['hour']}:${p['minute']}`;

  switch (formato) {
    case 'corta':
      return `${p['day']} ${p['month']}`;
    case 'hora':
      return hora;
    case 'completa': {
      const zona = p['timeZoneName'].replace('GMT', 'UTC').replace('-', '−');
      return `${p['day']} ${p['month']} ${p['year']}, ${hora} (${zona})`;
    }
    case 'mes':
      return `${p['month'][0].toUpperCase()}${p['month'].slice(1)} ${p['year']}`;
  }
}

// Clave para agrupar por mes: "2026-10".
export function claveMes(iso: string): string {
  const p = partes(iso, { year: 'numeric', month: '2-digit' });
  return `${p['year']}-${p['month']}`;
}
