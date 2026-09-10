import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Conjunto de IDs de mundo asignados a un estudiante (por sus grupos o asignaciones directas).
// Devuelve null si NO tiene ninguna asignación (→ acceso a todo, comportamiento normal).
async function mundosAsignados(usuarioId: number): Promise<Set<number> | null> {
  const rows = await prisma.$queryRaw<Array<{ mundo_id: number }>>`
    SELECT DISTINCT a.mundo_id AS mundo_id FROM asignaciones a
      WHERE a.mundo_id IS NOT NULL
        AND (a.estudiante_id = ${usuarioId} OR a.aula_id IN (SELECT aula_id FROM inscripciones WHERE estudiante_id = ${usuarioId}))
    UNION
    SELECT DISTINCT n.mundo_id AS mundo_id FROM asignaciones a JOIN niveles n ON n.id = a.nivel_id
      WHERE a.nivel_id IS NOT NULL
        AND (a.estudiante_id = ${usuarioId} OR a.aula_id IN (SELECT aula_id FROM inscripciones WHERE estudiante_id = ${usuarioId}))
  `;
  if (rows.length === 0) return null;
  return new Set(rows.map((r) => Number(r.mundo_id)));
}

export const curriculumRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/worlds', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    // Docentes y admin pueden explorar cualquier mundo sin tener que completarlos
    const accesoLibre = user.rol === 'docente' || user.rol === 'admin';
    const { categoria = 'programacion' } = request.query as { categoria?: string };

    const allWorlds = await prisma.world.findMany({
      orderBy: { numeroOrden: 'asc' },
      include: {
        niveles: {
          where: { activo: true },
          orderBy: { numeroOrden: 'asc' },
          select: {
            id: true,
            nombre: true,
            numeroOrden: true,
            bandaRecomendada: true,
          },
        },
      },
    });
    // Mapa de categoría por mundo vía SQL crudo (robusto aunque el cliente Prisma no esté regenerado)
    const cats = await prisma.$queryRaw<Array<{ id: number; categoria: string }>>`SELECT id, categoria FROM mundos`;
    const catMap = new Map(cats.map((c) => [c.id, c.categoria]));
    let worlds = allWorlds.filter((w) => (catMap.get(w.id) ?? 'programacion') === categoria);

    // Restricción por asignaciones: si un estudiante pertenece a grupos (o tiene asignaciones
    // directas) con mundos asignados, SOLO ve esos mundos. El docente decide qué mundos hace
    // cada grupo y puede ir agregando más. Sin asignaciones → comportamiento normal (todos).
    const asignados = await mundosAsignados(user.id);
    if (!accesoLibre && asignados) {
      worlds = worlds.filter((w) => asignados.has(w.id));
    }

    // Niveles que tienen mini-juego (config.juego). Tipo del juego para mostrar su icono.
    const juegos = await prisma.$queryRaw<Array<{ id: number; tipo: string | null }>>`
      SELECT id, config->'juego'->>'tipo' AS tipo FROM niveles WHERE activo = true AND (config->'juego') IS NOT NULL`;
    const juegoMap = new Map(juegos.map((j) => [j.id, j.tipo]));

    // Audio de la instrucción (preescolar): para narrar la actividad al pasar el dedo
    const audios = await prisma.$queryRaw<Array<{ id: number; audio: string | null }>>`
      SELECT id, config->>'audio' AS audio FROM niveles WHERE activo = true AND (config->>'audio') IS NOT NULL`;
    const audioMap = new Map(audios.map((a) => [a.id, a.audio]));

    // Cargar progreso del usuario
    const sesiones = await prisma.levelSession.findMany({
      where: { usuarioId: user.id, completada: true },
      select: { nivelId: true, estrellas: true },
    });

    const progreso: Record<number, number> = {};
    for (const s of sesiones) {
      if (!progreso[s.nivelId] || s.estrellas > progreso[s.nivelId]) {
        progreso[s.nivelId] = s.estrellas;
      }
    }

    // Progreso por mundo
    const worldsBase = worlds.map((w) => {
      const niveles = w.niveles.map((n) => ({
        ...n,
        estrellas: progreso[n.id] ?? 0,
        completado: (progreso[n.id] ?? 0) > 0,
        juego: juegoMap.get(n.id) ?? null,
        audio: audioMap.get(n.id) ?? null,
      }));
      const completos = niveles.filter((n) => n.completado).length;
      return {
        w,
        niveles,
        estrellasObtenidas: niveles.reduce((acc, n) => acc + n.estrellas, 0),
        estrellasTotal: niveles.length * 3,
        // "Terminado" = tiene niveles y todos completados
        terminado: niveles.length > 0 && completos === niveles.length,
      };
    });

    // Desbloqueo dinámico: el Mundo 1 siempre abierto; el mundo N se desbloquea
    // cuando el mundo anterior está terminado.
    const worldsConProgreso = worldsBase.map((b, idx) => ({
      ...b.w,
      niveles: b.niveles,
      estrellasObtenidas: b.estrellasObtenidas,
      estrellasTotal: b.estrellasTotal,
      // Docentes/admin: todo abierto. Estudiantes con mundos asignados: todos los asignados
      // quedan disponibles (el docente controla el alcance). Sin asignaciones: desbloqueo
      // secuencial (mundo N se abre al terminar el N-1).
      bloqueado: accesoLibre ? false : (asignados ? false : (idx === 0 ? false : !worldsBase[idx - 1].terminado)),
    }));

    return reply.send({ worlds: worldsConProgreso });
  });

  // Estadísticas propias del estudiante (para su panel "Mi Progreso").
  fastify.get('/mis-estadisticas', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number };
    const uid = user.id;

    const [resumenRow] = await prisma.$queryRaw<any[]>`
      WITH mejores AS (SELECT nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE completada AND usuario_id=${uid} GROUP BY nivel_id)
      SELECT (SELECT COUNT(*)::int FROM mejores) actividades,
             (SELECT COALESCE(SUM(est),0)::int FROM mejores) estrellas,
             (SELECT COALESCE(SUM(tiempo_segundos),0)::int FROM sesiones_nivel WHERE usuario_id=${uid}) tiempo,
             (SELECT COALESCE(racha_dias,0)::int FROM usuarios WHERE id=${uid}) racha`;

    const porMateria = await prisma.$queryRaw<any[]>`
      WITH hechos AS (SELECT DISTINCT s.nivel_id FROM sesiones_nivel s WHERE s.completada AND s.usuario_id=${uid}),
      comp AS (SELECT mu.categoria, COUNT(*)::int completados FROM hechos h JOIN niveles n ON n.id=h.nivel_id JOIN mundos mu ON mu.id=n.mundo_id GROUP BY mu.categoria),
      tot AS (SELECT mu.categoria, COUNT(nn.id)::int total FROM niveles nn JOIN mundos mu ON mu.id=nn.mundo_id WHERE nn.activo GROUP BY mu.categoria)
      SELECT c.categoria, c.completados, t.total FROM comp c JOIN tot t ON t.categoria=c.categoria ORDER BY c.completados DESC`;

    const porMundo = await prisma.$queryRaw<any[]>`
      WITH hechos AS (SELECT n.mundo_id, COUNT(DISTINCT s.nivel_id)::int hechos FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id WHERE s.completada AND s.usuario_id=${uid} GROUP BY n.mundo_id),
      tot AS (SELECT mundo_id, COUNT(*)::int total FROM niveles WHERE activo GROUP BY mundo_id)
      SELECT m.id, m.nombre, m.icono, m.categoria, h.hechos, t.total
      FROM hechos h JOIN mundos m ON m.id=h.mundo_id JOIN tot t ON t.mundo_id=m.id
      ORDER BY h.hechos DESC LIMIT 12`;

    const distRaw = await prisma.$queryRaw<any[]>`
      WITH mejores AS (SELECT nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE completada AND usuario_id=${uid} GROUP BY nivel_id)
      SELECT est, COUNT(*)::int c FROM mejores GROUP BY est`;
    const distribucionEstrellas: Record<number, number> = { 1: 0, 2: 0, 3: 0 };
    for (const r of distRaw) if (r.est >= 1 && r.est <= 3) distribucionEstrellas[r.est] = r.c;

    const diasRaw = await prisma.$queryRaw<any[]>`
      SELECT to_char(completada_en::date,'YYYY-MM-DD') dia, COUNT(*)::int c
      FROM sesiones_nivel WHERE completada AND usuario_id=${uid} AND completada_en >= NOW() - INTERVAL '13 days'
      GROUP BY dia ORDER BY dia`;
    const mapaDia = new Map(diasRaw.map((d) => [d.dia, d.c]));
    const actividadPorDia: { dia: string; c: number }[] = [];
    for (let i = 13; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const k = d.toISOString().slice(0, 10); actividadPorDia.push({ dia: k, c: mapaDia.get(k) ?? 0 }); }

    return reply.send({
      resumen: {
        actividades: resumenRow?.actividades ?? 0,
        estrellas: resumenRow?.estrellas ?? 0,
        tiempoTotalSeg: resumenRow?.tiempo ?? 0,
        racha: resumenRow?.racha ?? 0,
        materiasIniciadas: porMateria.length,
      },
      porMateria, porMundo, distribucionEstrellas, actividadPorDia,
    });
  });

  fastify.get('/worlds/:worldId/levels', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { worldId } = request.params as { worldId: string };
    const user = request.user as { id: number };

    const world = await prisma.world.findUnique({
      where: { id: parseInt(worldId, 10) },
    });

    if (!world) {
      return reply.code(404).send({ error: 'Mundo no encontrado' });
    }

    const levels = await prisma.level.findMany({
      where: { mundoId: parseInt(worldId, 10), activo: true },
      orderBy: { numeroOrden: 'asc' },
    });

    const sesiones = await prisma.levelSession.findMany({
      where: {
        usuarioId: user.id,
        nivelId: { in: levels.map((l) => l.id) },
        completada: true,
      },
      select: { nivelId: true, estrellas: true, modalidadUsada: true },
    });

    const progreso: Record<number, { estrellas: number; modalidad: string | null }> = {};
    for (const s of sesiones) {
      if (!progreso[s.nivelId] || s.estrellas > progreso[s.nivelId].estrellas) {
        progreso[s.nivelId] = { estrellas: s.estrellas, modalidad: s.modalidadUsada };
      }
    }

    const levelsConProgreso = levels.map((l) => ({
      id: l.id,
      nombre: l.nombre,
      numeroOrden: l.numeroOrden,
      bandaRecomendada: l.bandaRecomendada,
      estrellas: progreso[l.id]?.estrellas ?? 0,
      completado: (progreso[l.id]?.estrellas ?? 0) > 0,
      modalidadUsada: progreso[l.id]?.modalidad ?? null,
      juego: (l.config as any)?.juego?.tipo ?? null,
    }));

    return reply.send({ world, levels: levelsConProgreso });
  });

  // Lista de materias/categorías disponibles con conteo de mundos y niveles
  fastify.get('/categorias', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    const accesoLibre = user.rol === 'docente' || user.rol === 'admin';

    // Conteo por mundo (para poder filtrar por asignaciones del estudiante).
    const worldRows = await prisma.$queryRaw<Array<{ id: number; categoria: string; niveles: number }>>`
      SELECT m.id, m.categoria, COUNT(n.id)::int AS niveles
      FROM mundos m LEFT JOIN niveles n ON n.mundo_id = m.id AND n.activo = true
      GROUP BY m.id, m.categoria
    `;

    const asignados = accesoLibre ? null : await mundosAsignados(user.id);
    const filtrados = asignados ? worldRows.filter((w) => asignados.has(Number(w.id))) : worldRows;

    const agg = new Map<string, { mundos: number; niveles: number }>();
    for (const w of filtrados) {
      const a = agg.get(w.categoria) ?? { mundos: 0, niveles: 0 };
      a.mundos += 1; a.niveles += Number(w.niveles);
      agg.set(w.categoria, a);
    }
    const categorias = [...agg.entries()].map(([categoria, v]) => ({ categoria, mundos: v.mundos, niveles: v.niveles }));
    return reply.send({ categorias });
  });

  fastify.get('/levels/:levelId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { levelId } = request.params as { levelId: string };
    const user = request.user as { id: number };

    const level = await prisma.level.findUnique({
      where: { id: parseInt(levelId, 10) },
      include: {
        // categoria y totalNiveles: el frontend arma con ellos la lección previa del
        // tema y el progreso del mundo que muestra la celebración final.
        mundo: { select: { id: true, nombre: true, numeroOrden: true, categoria: true, totalNiveles: true } },
        pistas: { orderBy: { orden: 'asc' } },
      },
    });

    if (!level || !level.activo) {
      return reply.code(404).send({ error: 'Nivel no encontrado' });
    }

    const mejorSesion = await prisma.levelSession.findFirst({
      where: { usuarioId: user.id, nivelId: level.id, completada: true },
      orderBy: { estrellas: 'desc' },
      select: { estrellas: true, modalidadUsada: true },
    });

    return reply.send({
      level: {
        ...level,
        estrellasMejor: mejorSesion?.estrellas ?? 0,
        modalidadMejor: mejorSesion?.modalidadUsada ?? null,
      },
    });
  });

  fastify.get('/progress/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const jwtUser = request.user as { id: number; rol: string };

    const targetId = parseInt(userId, 10);
    // Solo puede ver su propio progreso o un docente/admin
    if (jwtUser.id !== targetId && jwtUser.rol === 'estudiante') {
      return reply.code(403).send({ error: 'Sin permiso para ver ese progreso' });
    }

    const user = await prisma.user.findUnique({
      where: { id: targetId },
      select: { id: true, nombre: true, bandaEdad: true, monedas: true, gemas: true, rachaDias: true },
    });

    if (!user) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    const sesiones = await prisma.levelSession.findMany({
      where: { usuarioId: targetId, completada: true },
      select: { nivelId: true, estrellas: true, modalidadUsada: true, completadaEn: true },
    });

    const logros = await prisma.userAchievement.findMany({
      where: { usuarioId: targetId },
      include: { logro: true },
      orderBy: { obtenidoEn: 'desc' },
      take: 10,
    });

    const totalEstrellas = sesiones.reduce((acc, s) => acc + s.estrellas, 0);
    const nivelesCompletados = new Set(sesiones.map((s) => s.nivelId)).size;
    const enviosBloques = sesiones.filter((s) => s.modalidadUsada === 'bloques').length;
    const enviosTexto = sesiones.filter((s) => s.modalidadUsada === 'texto').length;

    return reply.send({
      user,
      stats: {
        totalEstrellas,
        nivelesCompletados,
        enviosBloques,
        enviosTexto,
      },
      logrosRecientes: logros,
    });
  });
};
