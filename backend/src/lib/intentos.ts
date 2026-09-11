/**
 * Freno de intentos fallidos, por cuenta y por dirección IP.
 *
 * Existe porque un límite por IP a secas no sirve para el acceso infantil: un
 * aula de treinta niños comparte la red del colegio y entra a la vez. Un tope
 * bajo los bloquea a todos; un tope alto deja la puerta abierta a probar un PIN
 * de cuatro dibujos por fuerza bruta (solo hay 6.561 combinaciones).
 *
 * La solución es separar las dos cosas: se cuentan los intentos FALLIDOS por
 * cuenta, y aparte los fallidos por IP. Treinta niños entrando bien no suman ni
 * un intento; treinta intentos contra la misma cuenta se bloquean.
 *
 * Los contadores viven en memoria a propósito. Si el servidor se reinicia se
 * pierden, y es aceptable: no es un registro de auditoría, es un freno. Si algún
 * día hay varias instancias detrás de un balanceador, esto tendrá que mudarse a
 * un almacén compartido.
 */

/** Intentos fallidos consecutivos antes de bloquear una cuenta. */
export const MAX_FALLOS = 6;
/** Cuánto dura el bloqueo de una cuenta. */
export const BLOQUEO_MS = 5 * 60 * 1000;
/** Tras cuánto tiempo sin fallos se olvida el contador de una cuenta. */
export const OLVIDO_MS = 15 * 60 * 1000;

/** Fallos desde una misma IP antes de frenarla. */
export const MAX_FALLOS_IP = 30;
/** Cuánto dura el freno por IP, y ventana en la que se acumulan sus fallos. */
export const BLOQUEO_IP_MS = 10 * 60 * 1000;

interface Registro {
  fallos: number;
  ultimoFallo: number;
  bloqueadoHasta: number;
}

export interface EstadoIntentos {
  readonly bloqueado: boolean;
  /** Segundos que faltan para poder volver a intentar. */
  readonly esperaSegundos: number;
  readonly fallos: number;
}

const porCuenta = new Map<string, Registro>();
const porIp = new Map<string, Registro>();

/** Limpieza perezosa: se hace al consultar, sin temporizadores de fondo. */
function limpiar(
  mapa: Map<string, Registro>,
  clave: string,
  ahora: number,
  olvido: number,
): Registro | undefined {
  const registro = mapa.get(clave);
  if (!registro) return undefined;
  if (registro.bloqueadoHasta > ahora) return registro;
  if (ahora - registro.ultimoFallo > olvido) {
    mapa.delete(clave);
    return undefined;
  }
  return registro;
}

function estado(registro: Registro | undefined, ahora: number): EstadoIntentos {
  if (!registro) return { bloqueado: false, esperaSegundos: 0, fallos: 0 };
  const bloqueado = registro.bloqueadoHasta > ahora;
  return {
    bloqueado,
    esperaSegundos: bloqueado ? Math.ceil((registro.bloqueadoHasta - ahora) / 1000) : 0,
    fallos: registro.fallos,
  };
}

function anotar(
  mapa: Map<string, Registro>,
  clave: string,
  max: number,
  bloqueoMs: number,
  olvidoMs: number,
): EstadoIntentos {
  const ahora = Date.now();
  const registro = limpiar(mapa, clave, ahora, olvidoMs) ?? { fallos: 0, ultimoFallo: 0, bloqueadoHasta: 0 };

  registro.fallos += 1;
  registro.ultimoFallo = ahora;

  if (registro.fallos >= max) {
    registro.bloqueadoHasta = ahora + bloqueoMs;
    // El contador se reinicia: al salir del bloqueo se dan otras oportunidades,
    // en lugar de quedar bloqueado para siempre tras seis errores.
    registro.fallos = 0;
  }

  mapa.set(clave, registro);
  return estado(registro, ahora);
}

/** ¿Puede esta cuenta intentar entrar ahora mismo? */
export function comprobarIntentos(clave: string): EstadoIntentos {
  const ahora = Date.now();
  return estado(limpiar(porCuenta, clave.toLowerCase(), ahora, OLVIDO_MS), ahora);
}

/** Anota un intento fallido contra una cuenta. */
export function anotarFallo(clave: string): EstadoIntentos {
  return anotar(porCuenta, clave.toLowerCase(), MAX_FALLOS, BLOQUEO_MS, OLVIDO_MS);
}

/** Borra el contador de una cuenta tras un acceso correcto. */
export function olvidarFallos(clave: string): void {
  porCuenta.delete(clave.toLowerCase());
}

/**
 * El contador por cuenta frena adivinar el PIN de un niño concreto, pero no a
 * quien recorre nombres de usuario probando uno cada vez: cada cuenta acumula un
 * solo fallo y ninguna llega al tope. Este segundo contador cierra ese hueco
 * mirando la IP, y cuenta SOLO los fallos: un colegio entero entrando bien no
 * suma nada.
 */
export function comprobarIntentosIp(ip: string): EstadoIntentos {
  const ahora = Date.now();
  return estado(limpiar(porIp, ip, ahora, BLOQUEO_IP_MS), ahora);
}

export function anotarFalloIp(ip: string): EstadoIntentos {
  return anotar(porIp, ip, MAX_FALLOS_IP, BLOQUEO_IP_MS, BLOQUEO_IP_MS);
}

/** Vacía todos los contadores. Solo para las pruebas. */
export function reiniciarIntentos(): void {
  porCuenta.clear();
  porIp.clear();
}
