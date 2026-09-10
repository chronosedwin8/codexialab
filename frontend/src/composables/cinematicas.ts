/**
 * Memoria de las cinemáticas ya vistas (historia de cada mundo).
 * Se ven UNA vez: volver a verlas cada entrada sería un peaje. Se guarda en el
 * dispositivo (localStorage), no en el servidor: es comodidad, no dato del niño.
 */
const CLAVE = 'codexia.cinematicas-vistas';

function leerVistas(): string[] {
  try {
    const g = localStorage.getItem(CLAVE);
    return g ? (JSON.parse(g) as string[]) : [];
  } catch {
    return [];
  }
}

export function yaSeVio(clave: string): boolean {
  return leerVistas().includes(clave);
}

export function marcarVista(clave: string): void {
  try {
    const v = leerVistas();
    if (!v.includes(clave)) localStorage.setItem(CLAVE, JSON.stringify([...v, clave]));
  } catch {
    /* sin almacenamiento no se recuerda */
  }
}

export function olvidarCinematicas(): void {
  try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
}

/** Clave de la cinemática de entrada a un mundo. */
export const claveEntrada = (mundoId: number): string => `mundo-${mundoId}-entrada`;
