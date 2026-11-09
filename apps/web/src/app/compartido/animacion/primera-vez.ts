// Recuerda qué animaciones de entrada ya se vieron en esta sesión (mientras no se recargue la página).
// Un gráfico que crece la primera vez se disfruta; si lo hace cada vez que volvés al dashboard, cansa.
const vistas = new Set<string>();

/** true solo la primera vez que se pregunta por esta clave en la sesión. */
export function primeraVezEnSesion(clave: string): boolean {
  if (vistas.has(clave)) return false;
  vistas.add(clave);
  return true;
}
