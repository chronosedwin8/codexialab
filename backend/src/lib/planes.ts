/**
 * Planes a la venta y sus precios.
 *
 * Los precios viven en la tabla `planes` y los cambia un administrador desde el
 * panel. El monto de un cobro se decide SIEMPRE aquí, en el servidor: el precio
 * que muestra el navegador es solo informativo.
 *
 * Se cachea unos segundos porque el checkout consulta la configuración en cada
 * visita; al guardar un precio nuevo la caché se invalida al momento.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type ClavePlan = 'prueba' | 'individual' | 'escuela';
export const CLAVES_PLAN: readonly ClavePlan[] = ['prueba', 'individual', 'escuela'];

/** Límites de Mercado Pago Colombia para un cobro con tarjeta. */
export const MONTO_MIN_COP = 1000;
export const MONTO_MAX_COP = 50_000_000;

export interface PlanVenta {
  clave: ClavePlan;
  nombre: string;
  precioCop: number;
  activo: boolean;
  actualizadoEn: Date | null;
}

/** Valores de respaldo si la tabla aún no existe (antes de la migración 002). */
const RESPALDO: Record<ClavePlan, { nombre: string; env: string; defecto: number }> = {
  prueba: { nombre: 'Prueba 24 horas', env: 'PRECIO_PRUEBA_COP', defecto: 10000 },
  individual: { nombre: 'Licencia Individual', env: 'PRECIO_INDIVIDUAL_COP', defecto: 2000000 },
  escuela: { nombre: 'Licencia Escuela', env: 'PRECIO_ESCUELA_COP', defecto: 12000000 },
};

const TTL_MS = 15_000;
let cache: { at: number; planes: PlanVenta[] } | null = null;

export function invalidarPlanes(): void {
  cache = null;
}

export async function obtenerPlanes(): Promise<PlanVenta[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.planes;

  let planes: PlanVenta[];
  try {
    const filas = await prisma.plan.findMany();
    const porClave = new Map(filas.map((f) => [f.clave, f]));
    planes = CLAVES_PLAN.map((clave) => {
      const f = porClave.get(clave);
      if (f) {
        return { clave, nombre: f.nombre, precioCop: f.precioCop, activo: f.activo, actualizadoEn: f.actualizadoEn };
      }
      const r = RESPALDO[clave];
      return { clave, nombre: r.nombre, precioCop: parseInt(process.env[r.env] ?? String(r.defecto), 10), activo: true, actualizadoEn: null };
    });
  } catch {
    // Tabla ausente (migración aún no aplicada): se usan los valores del entorno.
    planes = CLAVES_PLAN.map((clave) => {
      const r = RESPALDO[clave];
      return { clave, nombre: r.nombre, precioCop: parseInt(process.env[r.env] ?? String(r.defecto), 10), activo: true, actualizadoEn: null };
    });
  }

  cache = { at: Date.now(), planes };
  return planes;
}

export async function obtenerPlan(clave: ClavePlan): Promise<PlanVenta> {
  const plan = (await obtenerPlanes()).find((p) => p.clave === clave);
  if (!plan) throw new Error(`Plan desconocido: ${clave}`);
  return plan;
}

/** Vigencia: la Prueba dura 24 horas; Individual y Escuela, un año. */
export function finVigencia(plan: ClavePlan, desde: Date): Date {
  const d = new Date(desde);
  if (plan === 'prueba') d.setHours(d.getHours() + 24);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}
