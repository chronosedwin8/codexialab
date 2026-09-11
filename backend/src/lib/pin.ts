/**
 * PIN de imágenes para prelectores.
 *
 * Un niño de cinco años no escribe un correo ni una contraseña, pero sí recuerda
 * y reconoce cuatro dibujos. Entra con un nombre de usuario corto que el docente
 * le lee ("sofia.r") y toca sus cuatro imágenes en orden.
 */
import bcrypt from 'bcrypt';
import type { PrismaClient } from '@prisma/client';
import { cifrarPin, hayClaveDePin } from './pinVisible.js';

/** Imágenes con las que se forma un PIN. Las mismas que ofrece la pantalla. */
export const IMAGENES_PIN = [
  'gato', 'sol', 'arbol', 'luna', 'pez', 'flor', 'nube', 'tren', 'pato',
] as const;

export type ImagenPin = (typeof IMAGENES_PIN)[number];

/** Número de imágenes que forman el PIN. */
export const LONGITUD_PIN = 4;

/**
 * Coste de bcrypt menor que el de una contraseña de adulto: se verifica en cada
 * inicio de sesión de un aula entera y su seguridad real viene del límite de
 * intentos y del contexto (hay que conocer el usuario), no de la fuerza del hash.
 */
const COSTE_PIN = 8;

/**
 * El PIN llega como una secuencia de identificadores de imagen (por ejemplo
 * ["gato","sol","gato","arbol"]). Se normaliza antes de cifrar para que el orden
 * y el formato no dependan del cliente.
 */
export function normalizarPin(imagenes: readonly string[]): string {
  return imagenes.map((i) => String(i).trim().toLowerCase()).join('|');
}

export async function hashPin(imagenes: readonly string[]): Promise<string> {
  return bcrypt.hash(normalizarPin(imagenes), COSTE_PIN);
}

export async function verificarPin(imagenes: readonly string[], hash: string): Promise<boolean> {
  return bcrypt.compare(normalizarPin(imagenes), hash);
}

/** Comprueba que son cuatro imágenes del catálogo. */
export function pinValido(imagenes: readonly string[]): boolean {
  return (
    Array.isArray(imagenes) &&
    imagenes.length === LONGITUD_PIN &&
    imagenes.every((i) => (IMAGENES_PIN as readonly string[]).includes(String(i).trim().toLowerCase()))
  );
}

/** Un PIN al azar, para el alta masiva cuando el docente no dicta uno. */
export function pinAleatorio(longitud = LONGITUD_PIN): string[] {
  return Array.from(
    { length: longitud },
    () => IMAGENES_PIN[Math.floor(Math.random() * IMAGENES_PIN.length)]!,
  );
}

/**
 * Prepara las dos formas en que se guarda un PIN: el hash con el que se entra y
 * la copia cifrada con la que el docente lo consulta.
 *
 * Si no hay clave configurada se guarda solo el hash. El acceso funciona igual;
 * lo que se pierde es poder mirarlo después, y eso se avisa en la interfaz en
 * lugar de fallar.
 */
export async function prepararPin(
  imagenes: readonly string[],
  secreto: string | undefined,
): Promise<{ pinHash: string; pinCifrado: string | null }> {
  return {
    pinHash: await hashPin(imagenes),
    pinCifrado: hayClaveDePin(secreto) ? cifrarPin(normalizarPin(imagenes), secreto) : null,
  };
}

/**
 * Genera un nombre de usuario libre a partir del nombre del niño.
 * Ejemplo: "Sofía Ramírez" → "sofia.r", "sofia.r2", "sofia.r3"…
 *
 * `reservados` son los nombres ya repartidos en este mismo lote pero todavía sin
 * crear. Hacen falta porque al dar de alta una clase entera hay dos "Ana López" y
 * ninguna existe aún en la base cuando se consulta: sin esto las dos pedirían el
 * mismo nombre y el alta del grupo entero fallaría.
 */
export async function generarUsuarioLibre(
  prisma: PrismaClient,
  nombreCompleto: string,
  reservados: ReadonlySet<string> = new Set(),
): Promise<string> {
  const partes = nombreCompleto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(Boolean);

  const nombre = partes[0] ?? 'codi';
  const inicial = partes[1]?.[0] ?? '';
  const base = inicial ? `${nombre}.${inicial}` : nombre;

  for (let intento = 0; intento < 200; intento++) {
    const candidato = intento === 0 ? base : `${base}${intento + 1}`;
    if (reservados.has(candidato)) continue;
    const existe = await prisma.user.findUnique({ where: { usuario: candidato } });
    if (!existe) return candidato;
  }
  throw new Error('No se pudo generar un nombre de usuario libre');
}
