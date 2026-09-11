/**
 * Copia recuperable del PIN de imágenes de un estudiante.
 *
 * POR QUÉ EXISTE. El PIN se guarda con bcrypt, que es de un solo sentido: ni el
 * servidor puede leerlo. Eso está bien para una contraseña, pero rompe una
 * necesidad real del aula: el docente reparte los PIN en clase, los escribe en
 * el tablero, y un niño de cinco años los olvida entre el lunes y el martes. Sin
 * poder consultarlos, la única salida sería reasignar el PIN de medio grupo cada
 * semana.
 *
 * QUÉ NO ES. No sustituye al hash. El acceso se sigue verificando contra
 * `pinHash`, así que esta columna no es una vía de entrada: quien se lleve la
 * base de datos no puede entrar con ella, y sin la clave del entorno tampoco
 * puede leerla.
 *
 * LO QUE SE ACEPTA A CAMBIO. Es una credencial de un menor guardada de forma
 * recuperable, y eso se sostiene con tres cosas: cifrado autenticado
 * (AES-256-GCM, que además detecta manipulación), acceso limitado al docente
 * dueño del aula, y una anotación en `auditoria_accesos` cada vez que alguien
 * las mira. Un PIN de cuatro imágenes de nueve son 6.561 combinaciones: nunca
 * fue un secreto fuerte, y se publica en clase de todos modos.
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/** Marca de versión del formato, para poder rotar el cifrado más adelante. */
const VERSION = 'v1';
const ALGORITMO = 'aes-256-gcm';
const BYTES_IV = 12;

/**
 * Deriva la clave de 32 bytes a partir del secreto del entorno.
 * Se admite un secreto de cualquier longitud y se normaliza con sha256, para que
 * configurarlo no obligue a generar exactamente 32 bytes en base64.
 */
function clave(secreto: string): Buffer {
  return createHash('sha256').update(secreto, 'utf8').digest();
}

/** Cierto si el entorno está configurado para poder mostrar los PIN. */
export function hayClaveDePin(secreto: string | undefined): secreto is string {
  return typeof secreto === 'string' && secreto.length >= 16;
}

/** La clave configurada en el entorno (o undefined si no la hay). */
export function secretoPin(): string | undefined {
  return process.env.PIN_SECRET;
}

/**
 * Cifra un PIN ya normalizado (por ejemplo "gato|sol|luna|flor").
 * El resultado es `v1:iv:tag:texto`, todo en base64url, que cabe de sobra en los
 * 255 caracteres de la columna.
 */
export function cifrarPin(pinNormalizado: string, secreto: string): string {
  const iv = randomBytes(BYTES_IV);
  const cifrador = createCipheriv(ALGORITMO, clave(secreto), iv);
  const texto = Buffer.concat([cifrador.update(pinNormalizado, 'utf8'), cifrador.final()]);
  const tag = cifrador.getAuthTag();

  return [VERSION, iv.toString('base64url'), tag.toString('base64url'), texto.toString('base64url')].join(':');
}

/**
 * Descifra un PIN guardado. Devuelve null si el dato no es legible.
 *
 * Se prefiere null a lanzar: una fila vieja, cifrada con otro secreto o
 * manipulada, no debe tumbar la lista entera de una clase de treinta. El docente
 * verá ese estudiante sin PIN visible y podrá asignarle uno nuevo.
 */
export function descifrarPin(guardado: string, secreto: string): string | null {
  try {
    const [version, ivB64, tagB64, textoB64] = guardado.split(':');
    if (version !== VERSION || !ivB64 || !tagB64 || !textoB64) return null;

    const descifrador = createDecipheriv(ALGORITMO, clave(secreto), Buffer.from(ivB64, 'base64url'));
    descifrador.setAuthTag(Buffer.from(tagB64, 'base64url'));

    return Buffer.concat([
      descifrador.update(Buffer.from(textoB64, 'base64url')),
      descifrador.final(),
    ]).toString('utf8');
  } catch {
    // Etiqueta que no cuadra, secreto cambiado o dato corrupto.
    return null;
  }
}

/** Convierte el PIN guardado a la lista de imágenes que entiende la interfaz. */
export function pinAImagenes(pinNormalizado: string): string[] {
  return pinNormalizado.split('|').filter((i) => i.length > 0);
}
