/**
 * ¿Puede esta cuenta usar Codexia? Depende de su licencia… solo si la tiene.
 *
 * LA REGLA. Una cuenta que nació de una COMPRA (tiene al menos una licencia)
 * entra solo mientras alguna de sus licencias esté activa y vigente. Una cuenta
 * que NO tiene licencias no se toca: son las del colegio —estudiantes importados
 * de Phidias, profesores, cuentas por SSO— que administra la institución y no se
 * compraron una a una. Exigirles licencia dejaría fuera a un colegio entero.
 *
 * POR QUÉ EN CADA PETICIÓN Y NO SOLO AL ENTRAR. El token dura 7 días. Si solo se
 * comprobara en el login, quien compra la Prueba de 24 horas y entra en la hora
 * 23 seguiría usando la plataforma una semana más.
 *
 * Se cachea por usuario un minuto para no consultar la base en cada llamada de
 * la app; al activar o cancelar una licencia la caché se invalida al momento.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export type MotivoBloqueo = 'pago_en_revision' | 'licencia_vencida' | 'sin_licencia_activa';

export type EstadoAcceso =
  | { permitido: true; motivo?: undefined; licenciaHasta?: Date | null }
  | { permitido: false; motivo: MotivoBloqueo; mensaje: string };

const TTL_MS = 60_000;
const cache = new Map<number, { at: number; estado: EstadoAcceso }>();

export function invalidarAcceso(usuarioId: number): void {
  cache.delete(usuarioId);
}

const MENSAJES: Record<MotivoBloqueo, string> = {
  pago_en_revision:
    'Tu pago está en revisión en Mercado Pago. Podrás entrar apenas se apruebe; suele tardar unos minutos.',
  licencia_vencida: 'Tu licencia de Codexia venció. Renuévala para seguir aprendiendo.',
  sin_licencia_activa: 'Tu cuenta no tiene una licencia activa. Completa la compra para entrar.',
};

export async function estadoAcceso(usuarioId: number, rol?: string): Promise<EstadoAcceso> {
  // Un administrador nunca queda fuera: es quien tendría que arreglarlo.
  if (rol === 'admin') return { permitido: true };

  const guardado = cache.get(usuarioId);
  if (guardado && Date.now() - guardado.at < TTL_MS) return guardado.estado;

  const estado = await calcular(usuarioId);
  cache.set(usuarioId, { at: Date.now(), estado });
  return estado;
}

async function calcular(usuarioId: number): Promise<EstadoAcceso> {
  const licencias = await prisma.licencia.findMany({
    where: { usuarioId },
    select: { id: true, estado: true, finVigencia: true, mpStatus: true },
  });

  // Cuenta del colegio (no comprada): acceso normal.
  if (licencias.length === 0) return { permitido: true };

  const ahora = Date.now();
  const vigente = licencias.find(
    (l) => l.estado === 'activa' && l.finVigencia !== null && l.finVigencia.getTime() > ahora,
  );
  if (vigente) return { permitido: true, licenciaHasta: vigente.finVigencia };

  const vencidas = licencias.filter(
    (l) => l.estado === 'activa' && l.finVigencia !== null && l.finVigencia.getTime() <= ahora,
  );
  if (vencidas.length) {
    // Se deja constancia en la base: el panel verá "vencida" y no "activa".
    await prisma.licencia
      .updateMany({ where: { id: { in: vencidas.map((l) => l.id) } }, data: { estado: 'vencida' } })
      .catch(() => { /* no es crítico */ });
  }

  const enRevision = licencias.some(
    (l) => l.estado === 'pendiente' && (l.mpStatus === 'in_process' || l.mpStatus === 'pending'),
  );
  const motivo: MotivoBloqueo = enRevision
    ? 'pago_en_revision'
    : vencidas.length || licencias.some((l) => l.estado === 'vencida')
      ? 'licencia_vencida'
      : 'sin_licencia_activa';

  return { permitido: false, motivo, mensaje: MENSAJES[motivo] };
}
