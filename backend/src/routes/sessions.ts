import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const startSessionSchema = z.object({
  nivel_id: z.number(),
  modalidad: z.enum(['bloques', 'bloques_texto', 'texto']),
});

const updateSessionSchema = z.object({
  tiempo_segundos: z.number().optional(),
  intentos: z.number().optional(),
  programa_bloques: z.record(z.any()).optional(),
});

const completeSessionSchema = z.object({
  estrellas: z.number().min(0).max(3),
  acciones_ejecutadas: z.number().default(0),
  bloques_usados: z.number().optional(),
});

export const sessionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/start', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number };
    const result = startSessionSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() });
    }

    const { nivel_id, modalidad } = result.data;

    const level = await prisma.level.findUnique({ where: { id: nivel_id } });
    if (!level) {
      return reply.code(404).send({ error: 'Nivel no encontrado' });
    }

    // Buscar sesión activa no completada
    const existingSession = await prisma.levelSession.findFirst({
      where: { usuarioId: user.id, nivelId: nivel_id, completada: false },
    });

    if (existingSession) {
      return reply.send({ session: existingSession, resumed: true });
    }

    const session = await prisma.levelSession.create({
      data: {
        usuarioId: user.id,
        nivelId: nivel_id,
        modalidadUsada: modalidad as any,
      },
    });

    return reply.code(201).send({ session, resumed: false });
  });

  fastify.put('/:sessionId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const user = request.user as { id: number };
    const result = updateSessionSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos' });
    }

    const session = await prisma.levelSession.findFirst({
      where: { id: parseInt(sessionId, 10), usuarioId: user.id },
    });

    if (!session) {
      return reply.code(404).send({ error: 'Sesión no encontrada' });
    }

    const updated = await prisma.levelSession.update({
      where: { id: session.id },
      data: {
        tiempoSegundos: result.data.tiempo_segundos,
        intentos: result.data.intentos,
        programaBloques: result.data.programa_bloques as any,
      },
    });

    return reply.send({ session: updated });
  });

  fastify.post('/:sessionId/complete', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    const user = request.user as { id: number };
    const result = completeSessionSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos' });
    }

    const session = await prisma.levelSession.findFirst({
      where: { id: parseInt(sessionId, 10), usuarioId: user.id },
      include: { nivel: true },
    });

    if (!session) {
      return reply.code(404).send({ error: 'Sesión no encontrada' });
    }

    const config = session.nivel.config as any;
    const recompensa = config.recompensa ?? { monedas: 10, gemas: 0 };
    const estrellas = result.data.estrellas;

    const monedasGanadas = Math.round(recompensa.monedas * (estrellas / 3));
    const gemasGanadas = estrellas === 3 ? (recompensa.gemas ?? 0) : 0;

    // Actualizar sesión
    const updatedSession = await prisma.levelSession.update({
      where: { id: session.id },
      data: {
        completada: true,
        estrellas,
        monedasGanadas,
        gemasGanadas,
        completadaEn: new Date(),
        intentos: { increment: 1 },
      },
    });

    // Dar recompensas al usuario
    await prisma.user.update({
      where: { id: user.id },
      data: {
        monedas: { increment: monedasGanadas },
        gemas: { increment: gemasGanadas },
        ultimaActividad: new Date(),
      },
    });

    // Verificar y otorgar logros
    const logrosNuevos = await checkAndGrantAchievements(user.id);

    return reply.send({
      session: updatedSession,
      recompensa: { monedas: monedasGanadas, gemas: gemasGanadas },
      logrosNuevos,
    });
  });
};

async function checkAndGrantAchievements(userId: number): Promise<any[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, monedas: true, gemas: true, rachaDias: true, logros: { select: { logroId: true } } },
  });
  if (!user) return [];
  const yaObt = new Set(user.logros.map((l) => l.logroId));

  // Progreso agregado (niveles distintos completados + estrellas máx por nivel)
  const prog = (await prisma.$queryRaw<any[]>`
    WITH mejores AS (SELECT nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE usuario_id = ${userId} AND completada GROUP BY nivel_id)
    SELECT COUNT(*)::int AS niveles, COALESCE(SUM(est),0)::int AS estrellas FROM mejores`)[0];

  // Tipos de actividad completados (arcade, simulacion, neurona, quiz, grid)
  const tipos = await prisma.$queryRaw<any[]>`
    SELECT DISTINCT COALESCE(n.config->>'tipo','grid') AS tipo
    FROM sesiones_nivel s JOIN niveles n ON n.id = s.nivel_id
    WHERE s.usuario_id = ${userId} AND s.completada`;
  const tiposSet = new Set(tipos.map((t) => t.tipo));

  // Mundos completados y materias completas (mundos 1..10 de una categoría)
  const mundos = await prisma.$queryRaw<any[]>`
    WITH hechos AS (SELECT DISTINCT nivel_id FROM sesiones_nivel WHERE usuario_id = ${userId} AND completada)
    SELECT mu.categoria, mu.numero_orden AS orden, COUNT(n.id)::int AS total, COUNT(h.nivel_id)::int AS hechos
    FROM mundos mu JOIN niveles n ON n.mundo_id = mu.id AND n.activo
    LEFT JOIN hechos h ON h.nivel_id = n.id
    GROUP BY mu.categoria, mu.numero_orden`;
  const nMundosCompletos = mundos.filter((m) => m.total > 0 && m.hechos >= m.total).length;
  const porCat: Record<string, { tot: number; comp: number }> = {};
  for (const m of mundos) if (m.orden <= 10) { porCat[m.categoria] = porCat[m.categoria] || { tot: 0, comp: 0 }; porCat[m.categoria].tot++; if (m.total > 0 && m.hechos >= m.total) porCat[m.categoria].comp++; }
  const materiasCompletas = Object.values(porCat).filter((v) => v.comp >= 10).length;

  const logros = await prisma.achievement.findMany({ where: { activo: true } });
  const nuevos: any[] = [];
  for (const l of logros) {
    if (yaObt.has(l.id)) continue;
    const cond = l.condicion as any;
    let cumple = false;
    switch (cond.tipo) {
      case 'niveles_completados': cumple = prog.niveles >= cond.cantidad; break;
      case 'estrellas': cumple = prog.estrellas >= cond.cantidad; break;
      case 'monedas': cumple = user.monedas >= cond.cantidad; break;
      case 'racha': cumple = user.rachaDias >= cond.cantidad; break;
      case 'mundos_completos': cumple = nMundosCompletos >= cond.cantidad; break;
      case 'materia_completa': cumple = materiasCompletas >= (cond.cantidad || 1); break;
      case 'tipo_actividad': cumple = tiposSet.has(cond.actividad); break;
    }
    if (!cumple) continue;

    await prisma.userAchievement.create({ data: { usuarioId: userId, logroId: l.id } });
    const rec = cond.recompensa || {};
    if (rec.monedas || rec.gemas) {
      await prisma.user.update({ where: { id: userId }, data: { monedas: { increment: rec.monedas || 0 }, gemas: { increment: rec.gemas || 0 } } });
    }
    let item = null;
    if (rec.item_id) {
      const tiene = await prisma.userInventory.findUnique({ where: { usuarioId_itemId: { usuarioId: userId, itemId: rec.item_id } } });
      if (!tiene) { await prisma.userInventory.create({ data: { usuarioId: userId, itemId: rec.item_id } }); item = await prisma.storeItem.findUnique({ where: { id: rec.item_id }, select: { id: true, nombre: true, tipo: true } }); }
    }
    nuevos.push({ id: l.id, nombre: l.nombre, descripcion: l.descripcion, icono: l.icono, rareza: l.rareza, recompensa: { monedas: rec.monedas || 0, gemas: rec.gemas || 0, item } });
  }
  return nuevos;
}
