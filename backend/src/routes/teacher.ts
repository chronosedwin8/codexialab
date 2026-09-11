import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import {
  IMAGENES_PIN,
  LONGITUD_PIN,
  generarUsuarioLibre,
  pinAleatorio,
  pinValido,
  prepararPin,
} from '../lib/pin.js';
import { descifrarPin, hayClaveDePin, pinAImagenes, secretoPin } from '../lib/pinVisible.js';
import { listarKlassen, obtenerKlassen, listarEstudiantesPlano, obtenerEstudiantesPorIds, phidiasConfigurado } from '../lib/phidias.js';

const prisma = new PrismaClient();

function esDocente(user: { rol: string }): boolean {
  return user.rol === 'docente' || user.rol === 'admin';
}

const createClassroomSchema = z.object({
  nombre: z.string().min(2).max(150),
  institucion_id: z.number().optional(),
});

const enrollSchema = z.object({
  estudiante_id: z.number(),
});

/**
 * Normaliza un correo: quita espacios (copiar-pegar suele traerlos) y pasa a
 * minúsculas. Sin esto, "Ana@X" y "ana@x" creaban DOS cuentas distintas y el
 * SSO de Microsoft —que siempre entrega el correo en minúsculas— no encontraba
 * la cuenta del estudiante.
 */
function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Traduce los errores de zod a un mensaje que el docente pueda entender. */
function mensajeValidacion(error: z.ZodError): string {
  const primero = error.issues[0];
  if (!primero) return 'Revisa los datos del formulario';
  const campo = String(primero.path[0] ?? '');
  const etiquetas: Record<string, string> = {
    nombre: 'El nombre', email: 'El correo', password: 'La contraseña',
    banda_edad: 'La banda de edad', ciudad: 'La ciudad',
  };
  const etiqueta = etiquetas[campo] ?? 'El dato';
  if (primero.code === 'invalid_string' && (primero as { validation?: string }).validation === 'email') {
    return 'El correo no es válido. Revisa que no tenga espacios ni le falte el @';
  }
  if (primero.code === 'too_small') {
    const min = (primero as { minimum?: number }).minimum ?? 0;
    return `${etiqueta} debe tener al menos ${min} caracteres`;
  }
  if (primero.code === 'too_big') {
    const max = (primero as { maximum?: number }).maximum ?? 0;
    return `${etiqueta} no puede superar ${max} caracteres`;
  }
  return `${etiqueta} no es válido`;
}

/**
 * Devuelve el aula si el usuario puede administrarla (su dueño, o admin).
 * null si no existe o no tiene permiso.
 */
async function aulaAdministrable(aulaId: number, user: { id: number; rol: string }) {
  const aula = await prisma.classroom.findUnique({
    where: { id: aulaId },
    select: { id: true, nombre: true, docenteId: true, institucionId: true },
  });
  if (!aula) return null;
  if (aula.docenteId !== user.id && user.rol !== 'admin') return null;
  return aula;
}

function generateClassCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const teacherRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/classrooms', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };

    if (user.rol !== 'docente' && user.rol !== 'admin') {
      return reply.code(403).send({ error: 'Solo docentes pueden acceder' });
    }

    // Un docente ve SUS grupos; un admin ve los de todo el colegio (por eso se
    // incluye el nombre del docente: sin él, en el panel del admin no se sabría
    // de quién es cada grupo).
    const classrooms = await prisma.classroom.findMany({
      where: { activa: true, ...(user.rol === 'admin' ? {} : { docenteId: user.id }) },
      include: {
        _count: { select: { inscripciones: true } },
        institucion: { select: { id: true, nombre: true } },
        docente: { select: { id: true, nombre: true } },
      },
      orderBy: { creadoEn: 'desc' },
    });

    return reply.send({
      classrooms: classrooms.map((c) => ({
        ...c,
        // Marca si quien pregunta puede administrarlo (para habilitar editar/borrar).
        esMio: c.docenteId === user.id,
      })),
    });
  });

  fastify.post('/classrooms', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };

    if (user.rol !== 'docente' && user.rol !== 'admin') {
      return reply.code(403).send({ error: 'Solo docentes pueden crear aulas' });
    }

    const result = createClassroomSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() });
    }

    const classroom = await prisma.classroom.create({
      data: {
        nombre: result.data.nombre,
        codigoAcceso: generateClassCode(),
        docenteId: user.id,
        institucionId: result.data.institucion_id,
      },
    });

    return reply.code(201).send({ classroom });
  });

  // ─── Editar un grupo (nombre y sede) ───
  fastify.patch('/classrooms/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const aulaId = parseInt((request.params as { id: string }).id, 10);
    const aula = await aulaAdministrable(aulaId, user);
    if (!aula) return reply.code(403).send({ error: 'Este grupo no existe o no es tuyo' });

    const schema = z.object({
      nombre: z.string().trim().min(2).max(150).optional(),
      // null desvincula el grupo de su sede.
      institucion_id: z.number().nullable().optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });

    if (r.data.institucion_id != null) {
      const sede = await prisma.institution.findUnique({ where: { id: r.data.institucion_id } });
      if (!sede) return reply.code(400).send({ error: 'La sede indicada no existe' });
    }

    const classroom = await prisma.classroom.update({
      where: { id: aulaId },
      data: {
        ...(r.data.nombre !== undefined ? { nombre: r.data.nombre } : {}),
        ...(r.data.institucion_id !== undefined ? { institucionId: r.data.institucion_id } : {}),
      },
      select: { id: true, nombre: true, codigoAcceso: true, institucionId: true },
    });
    return reply.send({ classroom });
  });

  // ─── Qué se perdería al borrar el grupo (para avisar ANTES de confirmar) ───
  fastify.get('/classrooms/:id/impacto-borrado', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const aulaId = parseInt((request.params as { id: string }).id, 10);
    const aula = await aulaAdministrable(aulaId, user);
    if (!aula) return reply.code(403).send({ error: 'Este grupo no existe o no es tuyo' });

    const [estudiantes, asignaciones] = await Promise.all([
      prisma.enrollment.count({ where: { aulaId } }),
      prisma.assignment.count({ where: { aulaId } }),
    ]);
    return reply.send({ nombre: aula.nombre, estudiantes, asignaciones });
  });

  // ─── Eliminar un grupo ───
  // Borra el grupo, sus inscripciones y sus asignaciones. Las CUENTAS de los
  // estudiantes y su progreso NO se tocan: siguen existiendo y conservan todo,
  // solo dejan de pertenecer a este grupo.
  fastify.delete('/classrooms/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const aulaId = parseInt((request.params as { id: string }).id, 10);
    const aula = await aulaAdministrable(aulaId, user);
    if (!aula) return reply.code(403).send({ error: 'Este grupo no existe o no es tuyo' });

    const [inscripciones, asignaciones] = await prisma.$transaction([
      prisma.enrollment.deleteMany({ where: { aulaId } }),
      prisma.assignment.deleteMany({ where: { aulaId } }),
      prisma.classroom.delete({ where: { id: aulaId } }),
    ]);

    request.log.info({ aulaId, nombre: aula.nombre, por: user.id }, 'Grupo eliminado');
    return reply.send({
      ok: true,
      nombre: aula.nombre,
      estudiantesLiberados: inscripciones.count,
      asignacionesBorradas: asignaciones.count,
    });
  });

  // ─── Sacar a un estudiante del grupo (sin borrar su cuenta) ───
  fastify.delete('/classrooms/:id/students/:sid', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { id, sid } = request.params as { id: string; sid: string };
    const aulaId = parseInt(id, 10);
    const estudianteId = parseInt(sid, 10);
    const aula = await aulaAdministrable(aulaId, user);
    if (!aula) return reply.code(403).send({ error: 'Este grupo no existe o no es tuyo' });

    const borradas = await prisma.enrollment.deleteMany({ where: { aulaId, estudianteId } });
    if (borradas.count === 0) return reply.code(404).send({ error: 'Ese estudiante no está en el grupo' });
    return reply.send({ ok: true });
  });

  fastify.get('/classrooms/:id/students', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: number; rol: string };

    const classroom = await prisma.classroom.findFirst({
      where: { id: parseInt(id, 10), docenteId: user.id },
    });

    if (!classroom && user.rol !== 'admin') {
      return reply.code(403).send({ error: 'Sin acceso a esta aula' });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { aulaId: parseInt(id, 10) },
      include: {
        estudiante: {
          select: {
            id: true,
            nombre: true,
            email: true,
            bandaEdad: true,
            modalidadPref: true,
            monedas: true,
            gemas: true,
            rachaDias: true,
            avatarConfig: true,
            _count: {
              select: { sesiones: { where: { completada: true } } },
            },
          },
        },
      },
    });

    const students = await Promise.all(
      enrollments.map(async (e) => {
        const totalEstrellas = await prisma.levelSession.aggregate({
          where: { usuarioId: e.estudiante.id, completada: true },
          _sum: { estrellas: true },
        });

        return {
          ...e.estudiante,
          nivelesCompletados: e.estudiante._count.sesiones,
          totalEstrellas: totalEstrellas._sum.estrellas ?? 0,
          inscritoEn: e.inscritoEn,
        };
      })
    );

    return reply.send({ students });
  });

  fastify.get('/classrooms/:id/progress', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: number; rol: string };
    const { mundo_id, modalidad } = request.query as { mundo_id?: string; modalidad?: string };

    const classroom = await prisma.classroom.findFirst({
      where: { id: parseInt(id, 10), docenteId: user.id },
    });

    if (!classroom && user.rol !== 'admin') {
      return reply.code(403).send({ error: 'Sin acceso a esta aula' });
    }

    // Usar vista v_progreso_aula
    const progreso = await prisma.$queryRaw`
      SELECT *
      FROM v_progreso_aula
      WHERE aula_id = ${parseInt(id, 10)}
      ORDER BY total_estrellas DESC
    `;

    return reply.send({ progreso });
  });

  // ===================== MATRIZ DE SEGUIMIENTO (estudiante × mundo, % completado) =====================
  fastify.get('/classrooms/:id/matriz', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: number; rol: string };
    const { categoria } = request.query as { categoria?: string };
    const aulaId = parseInt(id, 10);

    const classroom = await prisma.classroom.findFirst({ where: { id: aulaId, docenteId: user.id } });
    if (!classroom && user.rol !== 'admin') {
      return reply.code(403).send({ error: 'Sin acceso a esta aula' });
    }

    // Mundos con su total de niveles activos.
    const mundosRaw = await prisma.world.findMany({
      where: { ...(categoria ? { categoria } : {}) },
      select: {
        id: true, nombre: true, icono: true, categoria: true,
        colorPrimario: true, numeroOrden: true,
        _count: { select: { niveles: { where: { activo: true } } } },
      },
      orderBy: [{ categoria: 'asc' }, { numeroOrden: 'asc' }],
    });
    const mundosConNiveles = mundosRaw
      .filter((m) => m._count.niveles > 0)
      .map((m) => ({
        id: m.id, nombre: m.nombre, icono: m.icono ?? '🌍', categoria: m.categoria,
        color: m.colorPrimario ?? '#7C3AED', orden: m.numeroOrden, total: m._count.niveles,
      }));
    const mundoIds = mundosConNiveles.map((m) => m.id);

    // COLUMNAS de la matriz:
    //  - Con materia seleccionada → cada columna es un MUNDO (drill-down).
    //  - Sin materia → cada columna es una MATERIA (categoría), agregando sus mundos (vista general).
    // `mundoACol` mapea cada mundo a la clave de su columna.
    const mundoACol = new Map<number, string>();
    let mundos: { key: string; id: number | string; nombre: string; icono: string | null; categoria: string; color: string; total: number }[];

    if (categoria) {
      mundos = mundosConNiveles.map((m) => {
        mundoACol.set(m.id, `w${m.id}`);
        return { key: `w${m.id}`, id: m.id, nombre: m.nombre, icono: m.icono, categoria: m.categoria, color: m.color, total: m.total };
      });
    } else {
      const porCat = new Map<string, number>();
      for (const m of mundosConNiveles) {
        porCat.set(m.categoria, (porCat.get(m.categoria) ?? 0) + m.total);
        mundoACol.set(m.id, `c${m.categoria}`);
      }
      mundos = [...porCat.entries()].map(([cat, total]) => ({
        key: `c${cat}`, id: cat, nombre: cat, icono: null, categoria: cat, color: '#7C3AED', total,
      }));
    }
    const totalGlobal = mundos.reduce((acc, m) => acc + m.total, 0);

    // Estudiantes del aula.
    const inscripciones = await prisma.enrollment.findMany({
      where: { aulaId },
      include: { estudiante: { select: { id: true, nombre: true, email: true, avatarConfig: true, activo: true } } },
      orderBy: { estudiante: { nombre: 'asc' } },
    });
    const estudiantes = inscripciones.map((i) => i.estudiante);
    const studentIds = estudiantes.map((s) => s.id);

    // Niveles completados (distinct) por estudiante, con su mundo.
    const sesiones = studentIds.length
      ? await prisma.levelSession.findMany({
          where: { usuarioId: { in: studentIds }, completada: true, nivel: { activo: true, mundoId: { in: mundoIds } } },
          select: { usuarioId: true, nivelId: true, nivel: { select: { mundoId: true } } },
          distinct: ['usuarioId', 'nivelId'],
        })
      : [];

    // Cuenta de niveles completados por estudiante-columna.
    const conteo = new Map<string, number>();
    for (const s of sesiones) {
      const col = mundoACol.get(s.nivel.mundoId);
      if (!col) continue;
      const k = `${s.usuarioId}-${col}`;
      conteo.set(k, (conteo.get(k) ?? 0) + 1);
    }

    const filas = estudiantes.map((e) => {
      let hechosGlobal = 0;
      const celdas = mundos.map((m) => {
        const hechos = Math.min(conteo.get(`${e.id}-${m.key}`) ?? 0, m.total);
        hechosGlobal += hechos;
        return { key: m.key, completados: hechos, total: m.total, pct: m.total ? Math.round((hechos / m.total) * 100) : 0 };
      });
      return {
        id: e.id, nombre: e.nombre, email: e.email, activo: e.activo, avatarConfig: e.avatarConfig,
        celdas,
        globalCompletados: hechosGlobal,
        globalTotal: totalGlobal,
        globalPct: totalGlobal ? Math.round((hechosGlobal / totalGlobal) * 100) : 0,
      };
    });

    // Resumen para tarjetas: cuántos terminaron todo, a la mitad, promedio.
    const terminaron = filas.filter((f) => f.globalPct >= 100).length;
    const mitad = filas.filter((f) => f.globalPct >= 40 && f.globalPct < 100).length;
    const iniciando = filas.filter((f) => f.globalPct < 40).length;
    const promedio = filas.length ? Math.round(filas.reduce((a, f) => a + f.globalPct, 0) / filas.length) : 0;

    return reply.send({
      aula: { id: classroom?.id ?? aulaId, nombre: classroom?.nombre ?? '' },
      mundos,
      estudiantes: filas,
      resumen: { estudiantes: filas.length, terminaron, mitad, iniciando, promedio, totalActividades: mundos.length },
    });
  });

  // ===================== FICHA DE SEGUIMIENTO DE UN ESTUDIANTE (nivel por nivel + ranking) =====================
  fastify.get('/classrooms/:id/estudiante/:sid/detalle', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id, sid } = request.params as { id: string; sid: string };
    const user = request.user as { id: number; rol: string };
    const { categoria } = request.query as { categoria?: string };
    const aulaId = parseInt(id, 10);
    const estudianteId = parseInt(sid, 10);

    const classroom = await prisma.classroom.findFirst({ where: { id: aulaId, docenteId: user.id } });
    if (!classroom && user.rol !== 'admin') return reply.code(403).send({ error: 'Sin acceso a esta aula' });

    const estudiante = await prisma.user.findUnique({ where: { id: estudianteId }, select: { id: true, nombre: true, email: true } });
    if (!estudiante) return reply.code(404).send({ error: 'Estudiante no encontrado' });

    // Mundos con sus niveles activos (ordenados).
    const mundosRaw = await prisma.world.findMany({
      where: { ...(categoria ? { categoria } : {}) },
      select: {
        id: true, nombre: true, icono: true, categoria: true, numeroOrden: true,
        niveles: { where: { activo: true }, orderBy: { numeroOrden: 'asc' }, select: { id: true, nombre: true, numeroOrden: true } },
      },
      orderBy: [{ categoria: 'asc' }, { numeroOrden: 'asc' }],
    });
    const mundos = mundosRaw.filter((m) => m.niveles.length > 0);
    const nivelIds = mundos.flatMap((m) => m.niveles.map((n) => n.id));

    // Sesiones completadas del estudiante (mejor estrellas por nivel).
    const sesiones = await prisma.levelSession.findMany({
      where: { usuarioId: estudianteId, completada: true, nivelId: { in: nivelIds } },
      select: { nivelId: true, estrellas: true, completadaEn: true },
    });
    const hechoPorNivel = new Map<number, { estrellas: number; en: Date | null }>();
    for (const s of sesiones) {
      const prev = hechoPorNivel.get(s.nivelId);
      if (!prev || s.estrellas > prev.estrellas) hechoPorNivel.set(s.nivelId, { estrellas: s.estrellas, en: s.completadaEn });
    }

    let globalHechos = 0;
    const detalleMundos = mundos.map((m) => {
      const niveles = m.niveles.map((n) => {
        const h = hechoPorNivel.get(n.id);
        return { id: n.id, nombre: n.nombre, orden: n.numeroOrden, hecho: !!h, estrellas: h?.estrellas ?? 0 };
      });
      const completados = niveles.filter((n) => n.hecho).length;
      globalHechos += completados;
      // "Actividad actual": primer nivel pendiente del mundo.
      const primerPendiente = niveles.find((n) => !n.hecho);
      return {
        id: m.id, nombre: m.nombre, icono: m.icono ?? '🌍', categoria: m.categoria,
        completados, total: niveles.length, pct: niveles.length ? Math.round((completados / niveles.length) * 100) : 0,
        actualNivel: primerPendiente ? { orden: primerPendiente.orden, nombre: primerPendiente.nombre } : null,
        niveles,
      };
    });
    const globalTotal = nivelIds.length;
    const globalPct = globalTotal ? Math.round((globalHechos / globalTotal) * 100) : 0;

    // Actividad actual global: primer mundo no terminado (por orden) y su primer nivel pendiente.
    const mundoActual = detalleMundos.find((m) => m.completados < m.total) ?? null;

    // Ranking dentro del aula (por niveles completados en el mismo conjunto de mundos).
    const inscritos = await prisma.enrollment.findMany({ where: { aulaId }, select: { estudianteId: true } });
    const idsAula = inscritos.map((i) => i.estudianteId);
    const sesionesAula = idsAula.length
      ? await prisma.levelSession.findMany({
          where: { usuarioId: { in: idsAula }, completada: true, nivelId: { in: nivelIds } },
          select: { usuarioId: true, nivelId: true },
          distinct: ['usuarioId', 'nivelId'],
        })
      : [];
    const hechosPorAlumno = new Map<number, number>();
    for (const s of sesionesAula) hechosPorAlumno.set(s.usuarioId, (hechosPorAlumno.get(s.usuarioId) ?? 0) + 1);
    const ranking = idsAula
      .map((uid) => ({ uid, hechos: hechosPorAlumno.get(uid) ?? 0 }))
      .sort((a, b) => b.hechos - a.hechos);
    const posicion = ranking.findIndex((r) => r.uid === estudianteId) + 1;
    const promedioAula = idsAula.length
      ? Math.round((ranking.reduce((a, r) => a + r.hechos, 0) / idsAula.length))
      : 0;

    return reply.send({
      estudiante,
      global: { completados: globalHechos, total: globalTotal, pct: globalPct },
      ranking: { posicion, de: idsAula.length, promedioActividades: promedioAula, misActividades: globalHechos },
      actual: mundoActual ? { mundo: mundoActual.nombre, icono: mundoActual.icono, nivel: mundoActual.actualNivel } : null,
      mundos: detalleMundos,
    });
  });

  fastify.post('/classrooms/:id/enroll', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const user = request.user as { id: number; rol: string };

    const classroom = await prisma.classroom.findFirst({
      where: { id: parseInt(id, 10), docenteId: user.id },
    });

    if (!classroom && user.rol !== 'admin') {
      return reply.code(403).send({ error: 'Sin acceso a esta aula' });
    }

    const result = enrollSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos' });
    }

    const student = await prisma.user.findUnique({
      where: { id: result.data.estudiante_id, rol: 'estudiante' },
    });

    if (!student) {
      return reply.code(404).send({ error: 'Estudiante no encontrado' });
    }

    const existing = await prisma.enrollment.findUnique({
      where: {
        estudianteId_aulaId: {
          estudianteId: result.data.estudiante_id,
          aulaId: parseInt(id, 10),
        },
      },
    });

    if (existing) {
      return reply.code(409).send({ error: 'El estudiante ya está inscrito' });
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        estudianteId: result.data.estudiante_id,
        aulaId: parseInt(id, 10),
      },
    });

    return reply.code(201).send({ enrollment, student });
  });

  // ===================== IMPORTAR GRUPOS DESDE PHIDIAS =====================
  // Árbol Nivel → Curso → Klasse para que el docente elija qué importar.
  fastify.get('/phidias/klassen', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    if (!phidiasConfigurado()) {
      return reply.code(503).send({ error: 'La conexión con Phidias no está configurada (PHIDIAS_TOKEN)' });
    }
    const { year } = request.query as { year?: string };
    try {
      const niveles = await listarKlassen(year ? parseInt(year, 10) : undefined);
      return reply.send({ niveles });
    } catch (err: any) {
      return reply.code(502).send({ error: `No se pudo consultar Phidias: ${err.message}` });
    }
  });

  // Crea un aula por cada Klasse seleccionada e inscribe a sus estudiantes.
  fastify.post('/phidias/import', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    if (!phidiasConfigurado()) {
      return reply.code(503).send({ error: 'La conexión con Phidias no está configurada (PHIDIAS_TOKEN)' });
    }

    const schema = z.object({
      seccion_ids: z.array(z.number()).min(1).max(60), // caben todas las Klassen del colegio (~52)
      institucion_id: z.number().optional(),
      year: z.number().optional(),
      password: z.string().min(4).max(100).optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'Datos inválidos', details: r.error.flatten() });

    let klassen;
    try {
      klassen = await obtenerKlassen(r.data.seccion_ids, r.data.year);
    } catch (err: any) {
      return reply.code(502).send({ error: `No se pudo consultar Phidias: ${err.message}` });
    }
    if (klassen.length === 0) return reply.code(404).send({ error: 'No se encontraron las Klassen indicadas' });

    const passwordPlano = r.data.password ?? 'codexia123';
    // Un solo hash para todo el lote: bcrypt es costoso y son cientos de estudiantes.
    const hashComun = await bcrypt.hash(passwordPlano, 10);

    const grupos: any[] = [];
    const errores: any[] = [];

    for (const klasse of klassen) {
      try {
        // Reutiliza el aula si ya se importó antes esta misma Klasse.
        let aula = await prisma.classroom.findFirst({
          where: { docenteId: user.id, nombre: klasse.nombre, activa: true },
        });
        if (!aula) {
          aula = await prisma.classroom.create({
            data: {
              nombre: klasse.nombre,
              codigoAcceso: generateClassCode(),
              docenteId: user.id,
              institucionId: r.data.institucion_id,
            },
          });
        }

        const emails = klasse.estudiantes.map((e) => e.email);
        const existentes = await prisma.user.findMany({
          where: { email: { in: emails } },
          select: { id: true, email: true },
        });
        const porEmail = new Map(existentes.map((u) => [u.email, u.id]));

        const nuevos = klasse.estudiantes.filter((e) => !porEmail.has(e.email));
        if (nuevos.length) {
          await prisma.user.createMany({
            data: nuevos.map((e) => ({
              nombre: e.nombre,
              email: e.email,
              passwordHash: hashComun,
              rol: 'estudiante' as const,
              bandaEdad: klasse.bandaSugerida,
              institucionId: r.data.institucion_id,
            })),
            skipDuplicates: true,
          });
          const creados = await prisma.user.findMany({
            where: { email: { in: nuevos.map((e) => e.email) } },
            select: { id: true, email: true },
          });
          for (const c of creados) porEmail.set(c.email, c.id);
        }

        const inscripciones = klasse.estudiantes
          .map((e) => porEmail.get(e.email))
          .filter((id): id is number => typeof id === 'number')
          .map((estudianteId) => ({ estudianteId, aulaId: aula!.id }));

        const { count: inscritos } = await prisma.enrollment.createMany({
          data: inscripciones,
          skipDuplicates: true,
        });

        grupos.push({
          aula_id: aula.id,
          nombre: aula.nombre,
          codigoAcceso: aula.codigoAcceso,
          curso: klasse.curso,
          nivel: klasse.nivel,
          bandaEdad: klasse.bandaSugerida,
          totalEstudiantes: klasse.estudiantes.length,
          nuevos: nuevos.length,
          inscritos,
        });
      } catch (err: any) {
        errores.push({ klasse: klasse.nombre, error: err.message });
      }
    }

    return reply.send({ grupos, errores, password: passwordPlano });
  });

  // Lista PLANA de todos los estudiantes matriculados (para armar grupos mixtos),
  // ordenada por apellido. Filtro opcional `q` por apellido/nombre/curso/correo.
  fastify.get('/phidias/estudiantes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    if (!phidiasConfigurado()) return reply.code(503).send({ error: 'La conexión con Phidias no está configurada (PHIDIAS_TOKEN)' });
    const { year, q } = request.query as { year?: string; q?: string };
    try {
      let estudiantes = await listarEstudiantesPlano(year ? parseInt(year, 10) : undefined);
      const filtro = (q ?? '').trim().toLowerCase();
      if (filtro) {
        estudiantes = estudiantes.filter((e) =>
          `${e.apellido} ${e.firstname} ${e.curso} ${e.klasse} ${e.email}`.toLowerCase().includes(filtro),
        );
      }
      return reply.send({ estudiantes, total: estudiantes.length });
    } catch (err: any) {
      return reply.code(502).send({ error: `No se pudo consultar Phidias: ${err.message}` });
    }
  });

  // Crea UN grupo (aula) mixto con estudiantes elegidos individualmente de cualquier Klasse.
  fastify.post('/phidias/import-mixto', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    if (!phidiasConfigurado()) return reply.code(503).send({ error: 'La conexión con Phidias no está configurada (PHIDIAS_TOKEN)' });

    const schema = z.object({
      nombre: z.string().min(2).max(150),
      phidias_ids: z.array(z.number()).min(1).max(500),
      institucion_id: z.number().optional(),
      year: z.number().optional(),
      password: z.string().min(4).max(100).optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'Datos inválidos', details: r.error.flatten() });

    let estudiantes;
    try {
      estudiantes = await obtenerEstudiantesPorIds(r.data.phidias_ids, r.data.year);
    } catch (err: any) {
      return reply.code(502).send({ error: `No se pudo consultar Phidias: ${err.message}` });
    }
    if (estudiantes.length === 0) return reply.code(404).send({ error: 'No se encontraron los estudiantes indicados' });

    const passwordPlano = r.data.password ?? 'codexia123';
    const hashComun = await bcrypt.hash(passwordPlano, 10);

    // Aula (reutiliza si ya existe una con ese nombre para este docente).
    let aula = await prisma.classroom.findFirst({ where: { docenteId: user.id, nombre: r.data.nombre, activa: true } });
    if (!aula) {
      aula = await prisma.classroom.create({
        data: { nombre: r.data.nombre, codigoAcceso: generateClassCode(), docenteId: user.id, institucionId: r.data.institucion_id },
      });
    }

    // Crear cuentas faltantes (un solo hash para el lote) e inscribir.
    const emails = estudiantes.map((e) => e.email);
    const existentes = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true, email: true } });
    const porEmail = new Map(existentes.map((u) => [u.email, u.id]));

    const nuevos = estudiantes.filter((e) => !porEmail.has(e.email));
    if (nuevos.length) {
      await prisma.user.createMany({
        data: nuevos.map((e) => ({
          nombre: e.nombre, email: e.email, passwordHash: hashComun,
          rol: 'estudiante' as const, bandaEdad: e.banda, institucionId: r.data.institucion_id,
        })),
        skipDuplicates: true,
      });
      const creados = await prisma.user.findMany({ where: { email: { in: nuevos.map((e) => e.email) } }, select: { id: true, email: true } });
      for (const c of creados) porEmail.set(c.email, c.id);
    }

    const inscripciones = estudiantes
      .map((e) => porEmail.get(e.email))
      .filter((id): id is number => typeof id === 'number')
      .map((estudianteId) => ({ estudianteId, aulaId: aula!.id }));
    const { count: inscritos } = await prisma.enrollment.createMany({ data: inscripciones, skipDuplicates: true });

    return reply.send({
      aula: { id: aula.id, nombre: aula.nombre, codigoAcceso: aula.codigoAcceso },
      totalSeleccionados: estudiantes.length,
      nuevos: nuevos.length,
      inscritos,
      password: passwordPlano,
    });
  });

  // ===================== SEDES (instituciones) =====================
  fastify.get('/sedes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    // Se devuelven los conteos REALES (grupos y estudiantes) para que la sede
    // no sea una ficha vacía: así el docente ve de un vistazo qué hay en cada una.
    const sedes = await prisma.institution.findMany({
      where: { activa: true },
      select: {
        id: true, nombre: true, ciudad: true, pais: true,
        _count: { select: { aulas: true, usuarios: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    const estudiantesPorSede = await prisma.user.groupBy({
      by: ['institucionId'],
      where: { rol: 'estudiante', institucionId: { not: null } },
      _count: { _all: true },
    });
    const mapa = new Map(estudiantesPorSede.map((e) => [e.institucionId, e._count._all]));

    return reply.send({
      sedes: sedes.map((s) => ({
        id: s.id, nombre: s.nombre, ciudad: s.ciudad, pais: s.pais,
        grupos: s._count.aulas,
        estudiantes: mapa.get(s.id) ?? 0,
        personas: s._count.usuarios,
      })),
    });
  });

  // ─── Editar una sede (solo admin: es estructura del colegio) ───
  fastify.patch('/sedes/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (user.rol !== 'admin') return reply.code(403).send({ error: 'Solo un administrador puede editar sedes' });
    const sedeId = parseInt((request.params as { id: string }).id, 10);
    const schema = z.object({
      nombre: z.string().trim().min(2).max(200).optional(),
      ciudad: z.string().trim().max(100).optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });
    if (!(await prisma.institution.findUnique({ where: { id: sedeId } }))) {
      return reply.code(404).send({ error: 'Esa sede no existe' });
    }
    const sede = await prisma.institution.update({ where: { id: sedeId }, data: r.data });
    return reply.send({ sede });
  });

  // ─── Eliminar una sede (solo admin) ───
  // Si tiene grupos o personas asociadas NO se borra a ciegas: se avisa. Con
  // ?forzar=1 se desvinculan (quedan sin sede) y luego se elimina. Nunca se
  // borran grupos ni cuentas por eliminar una sede.
  fastify.delete('/sedes/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (user.rol !== 'admin') return reply.code(403).send({ error: 'Solo un administrador puede eliminar sedes' });
    const sedeId = parseInt((request.params as { id: string }).id, 10);
    const { forzar } = request.query as { forzar?: string };

    const sede = await prisma.institution.findUnique({ where: { id: sedeId }, select: { id: true, nombre: true } });
    if (!sede) return reply.code(404).send({ error: 'Esa sede no existe' });

    const [grupos, personas] = await Promise.all([
      prisma.classroom.count({ where: { institucionId: sedeId } }),
      prisma.user.count({ where: { institucionId: sedeId } }),
    ]);

    if ((grupos > 0 || personas > 0) && forzar !== '1') {
      return reply.code(409).send({
        error: `La sede "${sede.nombre}" tiene ${grupos} grupo(s) y ${personas} persona(s). Si la eliminas, quedarán SIN sede (no se borra nada más).`,
        grupos, personas, requiereConfirmacion: true,
      });
    }

    await prisma.$transaction([
      prisma.classroom.updateMany({ where: { institucionId: sedeId }, data: { institucionId: null } }),
      prisma.user.updateMany({ where: { institucionId: sedeId }, data: { institucionId: null } }),
      prisma.institution.delete({ where: { id: sedeId } }),
    ]);

    request.log.info({ sedeId, nombre: sede.nombre, grupos, personas }, 'Sede eliminada');
    return reply.send({ ok: true, nombre: sede.nombre, gruposDesvinculados: grupos, personasDesvinculadas: personas });
  });

  fastify.post('/sedes', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const schema = z.object({ nombre: z.string().trim().min(2).max(200), ciudad: z.string().trim().max(100).optional() });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });
    const yaExiste = await prisma.institution.findFirst({
      where: { nombre: { equals: r.data.nombre, mode: 'insensitive' }, activa: true },
      select: { id: true },
    });
    if (yaExiste) return reply.code(409).send({ error: `Ya existe una sede llamada "${r.data.nombre}"` });
    const sede = await prisma.institution.create({ data: { nombre: r.data.nombre, ciudad: r.data.ciudad } });
    return reply.code(201).send({ sede });
  });

  // ===================== ESTUDIANTES =====================
  // Lista todos los estudiantes (para inscribir en grupos)
  fastify.get('/students', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { q } = request.query as { q?: string };
    const students = await prisma.user.findMany({
      where: { rol: 'estudiante', email: { not: 'preescolar@codexia.local' }, ...(q ? { OR: [{ nombre: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}) },
      select: { id: true, nombre: true, email: true, bandaEdad: true, monedas: true, gemas: true, activo: true },
      orderBy: { nombre: 'asc' },
      take: 200,
    });
    return reply.send({ students });
  });

  // Crea una cuenta de estudiante
  fastify.post('/students', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const schema = z.object({
      nombre: z.string().trim().min(2).max(150),
      email: z.string().transform(normalizarEmail).pipe(z.string().email()),
      password: z.string().min(4).max(100),
      banda_edad: z.enum(['exploradores', 'aventureros', 'heroes']).optional(),
      aula_id: z.number().optional(), // si viene, se inscribe de una vez en ese grupo
      institucion_id: z.number().optional(), // sede a la que pertenece
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });
    const existe = await prisma.user.findUnique({ where: { email: r.data.email } });
    if (existe) return reply.code(409).send({ error: `Ya existe una cuenta con el correo ${r.data.email}` });
    const hash = await bcrypt.hash(r.data.password, 10);
    const student = await prisma.user.create({
      data: {
        nombre: r.data.nombre, email: r.data.email, passwordHash: hash, rol: 'estudiante',
        bandaEdad: r.data.banda_edad ?? 'aventureros',
        // Si no se indica sede, hereda la del grupo en que se inscribe.
        institucionId: r.data.institucion_id
          ?? (r.data.aula_id
            ? (await prisma.classroom.findUnique({ where: { id: r.data.aula_id }, select: { institucionId: true } }))?.institucionId ?? undefined
            : undefined),
      },
      select: { id: true, nombre: true, email: true, bandaEdad: true },
    });
    if (r.data.aula_id) {
      await prisma.enrollment.create({ data: { estudianteId: student.id, aulaId: r.data.aula_id } }).catch(() => {});
    }
    return reply.code(201).send({ student });
  });

  /**
   * ¿Puede este usuario administrar a este estudiante?
   * Un admin, a cualquiera. Un docente, solo a quien esté inscrito en alguno
   * de SUS grupos: así un profesor no puede tocar alumnos de otro colegio o
   * de otro profesor.
   */
  async function puedeAdministrarEstudiante(estudianteId: number, user: { id: number; rol: string }) {
    const alumno = await prisma.user.findUnique({
      where: { id: estudianteId },
      select: { id: true, nombre: true, email: true, rol: true },
    });
    if (!alumno) return { ok: false as const, code: 404, error: 'Ese estudiante no existe' };
    if (alumno.rol !== 'estudiante') {
      return { ok: false as const, code: 400, error: 'Esta acción es solo para cuentas de estudiante' };
    }
    if (alumno.email === 'preescolar@codexia.local') {
      return { ok: false as const, code: 400, error: 'La cuenta compartida de Preescolar no se puede eliminar' };
    }
    if (user.rol === 'admin') return { ok: true as const, alumno };
    const enAlgunGrupoMio = await prisma.enrollment.findFirst({
      where: { estudianteId, aula: { docenteId: user.id } },
      select: { id: true },
    });
    if (!enAlgunGrupoMio) return { ok: false as const, code: 403, error: 'Ese estudiante no está en ninguno de tus grupos' };
    return { ok: true as const, alumno };
  }

  // ─── Qué se perdería al eliminar la cuenta de un estudiante ───
  fastify.get('/students/:id/impacto-borrado', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const estudianteId = parseInt((request.params as { id: string }).id, 10);
    const permiso = await puedeAdministrarEstudiante(estudianteId, user);
    if (!permiso.ok) return reply.code(permiso.code).send({ error: permiso.error });

    const [grupos, sesiones, completados, logros] = await Promise.all([
      prisma.enrollment.count({ where: { estudianteId } }),
      prisma.levelSession.count({ where: { usuarioId: estudianteId } }),
      prisma.levelSession.count({ where: { usuarioId: estudianteId, completada: true } }),
      prisma.userAchievement.count({ where: { usuarioId: estudianteId } }),
    ]);
    return reply.send({ nombre: permiso.alumno.nombre, email: permiso.alumno.email, grupos, sesiones, completados, logros });
  });

  // ─── Eliminar la cuenta de un estudiante (definitivo) ───
  // Arrastra su progreso, envíos, logros e inventario: la BD tiene ON DELETE
  // CASCADE en esas tablas. Para sacarlo de un grupo SIN perder nada, usa
  // DELETE /classrooms/:id/students/:sid.
  fastify.delete('/students/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const estudianteId = parseInt((request.params as { id: string }).id, 10);
    if (estudianteId === user.id) return reply.code(400).send({ error: 'No puedes eliminar tu propia cuenta' });

    const permiso = await puedeAdministrarEstudiante(estudianteId, user);
    if (!permiso.ok) return reply.code(permiso.code).send({ error: permiso.error });

    const sesiones = await prisma.levelSession.count({ where: { usuarioId: estudianteId } });
    await prisma.user.delete({ where: { id: estudianteId } });

    request.log.warn({ estudianteId, email: permiso.alumno.email, por: user.id }, 'Cuenta de estudiante eliminada');
    return reply.send({ ok: true, nombre: permiso.alumno.nombre, sesionesBorradas: sesiones });
  });

  // ─── Eliminar la cuenta de un profesor (solo admin) ───
  // Ojo: en la BD `aulas.docente_id` es ON DELETE CASCADE, así que borrar al
  // profesor se llevaría SUS GRUPOS por delante. Por eso aquí se exige que no
  // le quede ninguno: primero se reasignan o se borran, y luego el profesor.
  fastify.delete('/teachers/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (user.rol !== 'admin') return reply.code(403).send({ error: 'Solo un administrador puede eliminar profesores' });
    const docenteId = parseInt((request.params as { id: string }).id, 10);
    if (docenteId === user.id) return reply.code(400).send({ error: 'No puedes eliminar tu propia cuenta' });

    const docente = await prisma.user.findUnique({ where: { id: docenteId }, select: { id: true, nombre: true, rol: true } });
    if (!docente) return reply.code(404).send({ error: 'Ese profesor no existe' });
    if (docente.rol !== 'docente' && docente.rol !== 'admin') {
      return reply.code(400).send({ error: 'Esa cuenta no es de profesor' });
    }

    const grupos = await prisma.classroom.count({ where: { docenteId } });
    if (grupos > 0) {
      return reply.code(409).send({
        error: `${docente.nombre} todavía tiene ${grupos} grupo${grupos > 1 ? 's' : ''}. Elimínalo${grupos > 1 ? 's' : ''} o pásalo${grupos > 1 ? 's' : ''} a otro profesor antes de borrar la cuenta.`,
      });
    }

    await prisma.user.delete({ where: { id: docenteId } });
    request.log.warn({ docenteId, por: user.id }, 'Cuenta de profesor eliminada');
    return reply.send({ ok: true, nombre: docente.nombre });
  });

  // ═══════════════════ PIN de imágenes (prelectores) ═══════════════════
  //
  // Los más pequeños no escriben correo ni contraseña: entran con un nombre de
  // jugador corto y cuatro dibujos. El docente reparte esos PIN en clase, así
  // que necesita poder verlos, cambiarlos y volver a imprimirlos.

  /** Deja anotado quién miró credenciales de menores. */
  async function anotarAcceso(datos: {
    actorId: number; alumnoId?: number | null; accion: string; recurso: string; ip?: string;
  }): Promise<void> {
    await prisma.accessAudit.create({
      data: {
        actorId: datos.actorId,
        alumnoId: datos.alumnoId ?? null,
        accion: datos.accion,
        recurso: datos.recurso,
        ip: datos.ip ?? null,
      },
    }).catch(() => { /* la auditoría nunca debe tumbar la operación */ });
  }

  /** El catálogo de dibujos, para pintar el selector en el panel. */
  fastify.get('/imagenes-pin', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    return reply.send({
      imagenes: IMAGENES_PIN,
      longitud: LONGITUD_PIN,
      puedeVerPines: hayClaveDePin(secretoPin()),
    });
  });

  /**
   * Las credenciales del grupo, PIN incluido.
   *
   * Es la lista que el docente imprime y pega en la pared. Solo muestra los PIN
   * si hay clave de cifrado configurada; si no, cada uno sale como no disponible
   * y hay que asignar uno nuevo para conocerlo.
   *
   * Cada consulta queda anotada: son credenciales de menores.
   */
  fastify.get('/classrooms/:id/credenciales', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const aulaId = parseInt((request.params as { id: string }).id, 10);
    const aula = await aulaAdministrable(aulaId, user);
    if (!aula) return reply.code(403).send({ error: 'Este grupo no existe o no es tuyo' });

    const inscripciones = await prisma.enrollment.findMany({
      where: { aulaId },
      orderBy: { estudiante: { nombre: 'asc' } },
      select: {
        estudiante: {
          select: { id: true, nombre: true, email: true, usuario: true, pinCifrado: true, activo: true },
        },
      },
    });

    const secreto = secretoPin();
    await anotarAcceso({
      actorId: user.id,
      accion: 'ver_credenciales',
      recurso: `aula:${aulaId} (${inscripciones.length})`,
      ip: request.ip,
    });

    return reply.send({
      aula: { id: aula.id, nombre: aula.nombre },
      puedeVerPines: hayClaveDePin(secreto),
      credenciales: inscripciones.map(({ estudiante }) => {
        const claro =
          hayClaveDePin(secreto) && estudiante.pinCifrado
            ? descifrarPin(estudiante.pinCifrado, secreto)
            : null;
        return {
          id: estudiante.id,
          nombre: estudiante.nombre,
          email: estudiante.email,
          usuario: estudiante.usuario,
          activo: estudiante.activo,
          pin: claro ? pinAImagenes(claro) : null,
        };
      }),
    });
  });

  /**
   * Cambia el PIN de varios estudiantes de una vez.
   *
   * Los dos casos reales del aula: el mismo PIN para todo el grupo (se escribe
   * en el tablero y se acabó), o uno distinto al azar para cada uno cuando el
   * grupo ya sabe cuidarlo. Sin `estudiante_ids` se aplica al aula entera.
   *
   * A quien no tenga nombre de jugador se le genera uno: es lo que hace falta
   * para que pueda entrar sin escribir su correo.
   */
  fastify.post('/classrooms/:id/pines', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const aulaId = parseInt((request.params as { id: string }).id, 10);
    const aula = await aulaAdministrable(aulaId, user);
    if (!aula) return reply.code(403).send({ error: 'Este grupo no existe o no es tuyo' });

    const schema = z.object({
      // Si viene un pin, es el MISMO para todos. Si no, uno aleatorio por niño.
      pin: z.array(z.string()).length(LONGITUD_PIN).optional(),
      estudiante_ids: z.array(z.number()).optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'El PIN debe tener exactamente 4 dibujos' });
    if (r.data.pin && !pinValido(r.data.pin)) {
      return reply.code(400).send({ error: 'Alguno de esos dibujos no existe' });
    }

    const inscripciones = await prisma.enrollment.findMany({
      where: { aulaId, ...(r.data.estudiante_ids?.length ? { estudianteId: { in: r.data.estudiante_ids } } : {}) },
      select: { estudiante: { select: { id: true, nombre: true, usuario: true } } },
      orderBy: { estudiante: { nombre: 'asc' } },
    });
    if (inscripciones.length === 0) return reply.code(400).send({ error: 'Ese grupo no tiene estudiantes' });

    const secreto = secretoPin();
    const reservados = new Set<string>();
    const cambios: Array<{ id: number; nombre: string; usuario: string; pin: string[] }> = [];

    for (const { estudiante } of inscripciones) {
      const pin = r.data.pin ? [...r.data.pin] : pinAleatorio();
      const { pinHash, pinCifrado } = await prepararPin(pin, secreto);

      let usuario = estudiante.usuario;
      if (!usuario) {
        usuario = await generarUsuarioLibre(prisma, estudiante.nombre, reservados);
        reservados.add(usuario);
      }

      await prisma.user.update({ where: { id: estudiante.id }, data: { pinHash, pinCifrado, usuario } });
      cambios.push({ id: estudiante.id, nombre: estudiante.nombre, usuario, pin });
    }

    await anotarAcceso({
      actorId: user.id,
      accion: r.data.pin ? 'pin_comun' : 'pin_aleatorio',
      recurso: `aula:${aulaId} (${cambios.length})`,
      ip: request.ip,
    });

    return reply.send({ ok: true, puedeVerPines: hayClaveDePin(secreto), cambios });
  });

  /** Cambia el PIN de UN estudiante (el caso de "se le olvidó justo a él"). */
  fastify.post('/students/:id/pin', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const estudianteId = parseInt((request.params as { id: string }).id, 10);
    const permiso = await puedeAdministrarEstudiante(estudianteId, user);
    if (!permiso.ok) return reply.code(permiso.code).send({ error: permiso.error });

    const schema = z.object({ pin: z.array(z.string()).length(LONGITUD_PIN).optional() });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'El PIN debe tener exactamente 4 dibujos' });
    if (r.data.pin && !pinValido(r.data.pin)) {
      return reply.code(400).send({ error: 'Alguno de esos dibujos no existe' });
    }

    const pin = r.data.pin ? [...r.data.pin] : pinAleatorio();
    const secreto = secretoPin();
    const { pinHash, pinCifrado } = await prepararPin(pin, secreto);

    const actual = await prisma.user.findUnique({ where: { id: estudianteId }, select: { usuario: true, nombre: true } });
    const usuario = actual?.usuario ?? (await generarUsuarioLibre(prisma, actual?.nombre ?? 'codi'));

    await prisma.user.update({ where: { id: estudianteId }, data: { pinHash, pinCifrado, usuario } });
    await anotarAcceso({
      actorId: user.id, alumnoId: estudianteId, accion: 'pin_individual',
      recurso: `estudiante:${estudianteId}`, ip: request.ip,
    });

    return reply.send({ ok: true, nombre: permiso.alumno.nombre, usuario, pin, puedeVerPines: hayClaveDePin(secreto) });
  });

  /** Quita el acceso por dibujos de un estudiante (vuelve a correo y contraseña). */
  fastify.delete('/students/:id/pin', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const estudianteId = parseInt((request.params as { id: string }).id, 10);
    const permiso = await puedeAdministrarEstudiante(estudianteId, user);
    if (!permiso.ok) return reply.code(permiso.code).send({ error: permiso.error });

    await prisma.user.update({ where: { id: estudianteId }, data: { pinHash: null, pinCifrado: null } });
    await anotarAcceso({
      actorId: user.id, alumnoId: estudianteId, accion: 'pin_retirado',
      recurso: `estudiante:${estudianteId}`, ip: request.ip,
    });
    return reply.send({ ok: true });
  });

  // ===================== ASIGNACIONES =====================
  fastify.get('/assignments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const rows = await prisma.$queryRaw<any[]>`
      SELECT a.id, a.titulo, a.instrucciones, a.fecha_limite AS "fechaLimite", a.creado_en AS "creadoEn",
             a.aula_id AS "aulaId", au.nombre AS "aulaNombre",
             a.estudiante_id AS "estudianteId", u.nombre AS "estudianteNombre",
             a.mundo_id AS "mundoId", m.nombre AS "mundoNombre",
             a.nivel_id AS "nivelId", n.nombre AS "nivelNombre"
      FROM asignaciones a
      LEFT JOIN aulas au ON a.aula_id = au.id
      LEFT JOIN usuarios u ON a.estudiante_id = u.id
      LEFT JOIN mundos m ON a.mundo_id = m.id
      LEFT JOIN niveles n ON a.nivel_id = n.id
      WHERE a.docente_id = ${user.id}
      ORDER BY a.creado_en DESC
    `;
    return reply.send({ assignments: rows });
  });

  fastify.post('/assignments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const schema = z.object({
      aula_id: z.number().optional(),
      estudiante_id: z.number().optional(),
      mundo_id: z.number().optional(),
      nivel_id: z.number().optional(),
      titulo: z.string().max(200).optional(),
      instrucciones: z.string().optional(),
      fecha_limite: z.string().optional(),
    }).refine((d) => d.aula_id || d.estudiante_id, { message: 'Indica un grupo o un estudiante' })
      .refine((d) => d.mundo_id || d.nivel_id, { message: 'Indica un mundo o un nivel' });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'Datos inválidos', details: r.error.flatten() });
    const d = r.data;
    const rows = await prisma.$queryRaw<any[]>`
      INSERT INTO asignaciones (docente_id, aula_id, estudiante_id, mundo_id, nivel_id, titulo, instrucciones, fecha_limite)
      VALUES (${user.id}, ${d.aula_id ?? null}, ${d.estudiante_id ?? null}, ${d.mundo_id ?? null}, ${d.nivel_id ?? null}, ${d.titulo ?? null}, ${d.instrucciones ?? null}, ${d.fecha_limite ? new Date(d.fecha_limite) : null})
      RETURNING id
    `;
    return reply.code(201).send({ id: rows[0]?.id });
  });

  fastify.delete('/assignments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { id } = request.params as { id: string };
    await prisma.$executeRaw`DELETE FROM asignaciones WHERE id = ${parseInt(id, 10)} AND docente_id = ${user.id}`;
    return reply.send({ ok: true });
  });

  // Asignaciones del estudiante actual (por sus grupos o directas)
  fastify.get('/my-assignments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number };
    const rows = await prisma.$queryRaw<any[]>`
      SELECT DISTINCT a.id, a.titulo, a.instrucciones, a.fecha_limite AS "fechaLimite",
             a.mundo_id AS "mundoId", m.nombre AS "mundoNombre",
             a.nivel_id AS "nivelId", n.nombre AS "nivelNombre"
      FROM asignaciones a
      LEFT JOIN mundos m ON a.mundo_id = m.id
      LEFT JOIN niveles n ON a.nivel_id = n.id
      WHERE a.estudiante_id = ${user.id}
         OR a.aula_id IN (SELECT aula_id FROM inscripciones WHERE estudiante_id = ${user.id})
      ORDER BY a.fecha_limite NULLS LAST
    `;
    return reply.send({ assignments: rows });
  });

  // ===================== CARGA MASIVA DE ESTUDIANTES =====================
  fastify.post('/students/bulk', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const schema = z.object({
      aula_id: z.number().optional(),
      banda_edad: z.enum(['exploradores', 'aventureros', 'heroes']).optional(),
      estudiantes: z.array(z.object({
        nombre: z.string().trim().min(1),
        email: z.string().transform(normalizarEmail).pipe(z.string().email()).optional(),
        password: z.string().optional(),
      })).min(1).max(300),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });

    const creados: any[] = []; const errores: any[] = [];
    let i = 0;
    for (const e of r.data.estudiantes) {
      i++;
      try {
        // Email automático si no se da: derivado del nombre
        const email = e.email || normalizarEmail(`${e.nombre.toLowerCase().replace(/[^a-z0-9]/g, '')}.${Date.now().toString().slice(-4)}${i}@codexia.edu`);
        const pass = e.password || 'codexia123';
        let student = await prisma.user.findUnique({ where: { email } });
        let nuevo = false;
        if (!student) {
          const hash = await bcrypt.hash(pass, 10);
          student = await prisma.user.create({
            data: { nombre: e.nombre, email, passwordHash: hash, rol: 'estudiante', bandaEdad: r.data.banda_edad ?? 'aventureros' },
          });
          nuevo = true;
        }
        if (r.data.aula_id) {
          const exists = await prisma.enrollment.findUnique({ where: { estudianteId_aulaId: { estudianteId: student.id, aulaId: r.data.aula_id } } });
          if (!exists) await prisma.enrollment.create({ data: { estudianteId: student.id, aulaId: r.data.aula_id } });
        }
        creados.push({ id: student.id, nombre: student.nombre, email, password: nuevo ? pass : undefined, nuevo });
      } catch (err: any) {
        errores.push({ nombre: e.nombre, error: err.message });
      }
    }
    return reply.send({ creados, errores, total: r.data.estudiantes.length });
  });

  // ===================== PROGRESO DE UNA ASIGNACIÓN =====================
  fastify.get('/assignments/:id/progress', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { id } = request.params as { id: string };
    const a = (await prisma.$queryRaw<any[]>`SELECT * FROM asignaciones WHERE id = ${parseInt(id, 10)} AND docente_id = ${user.id}`)[0];
    if (!a) return reply.code(404).send({ error: 'Asignación no encontrada' });

    // Niveles objetivo
    const niveles = a.nivel_id
      ? await prisma.level.findMany({ where: { id: a.nivel_id }, select: { id: true, nombre: true, numeroOrden: true } })
      : await prisma.level.findMany({ where: { mundoId: a.mundo_id, activo: true }, orderBy: { numeroOrden: 'asc' }, select: { id: true, nombre: true, numeroOrden: true } });
    const nivelIds = niveles.map((n) => n.id);

    // Estudiantes objetivo
    const estudiantes = a.estudiante_id
      ? await prisma.user.findMany({ where: { id: a.estudiante_id }, select: { id: true, nombre: true } })
      : (await prisma.enrollment.findMany({ where: { aulaId: a.aula_id }, include: { estudiante: { select: { id: true, nombre: true } } } })).map((e) => e.estudiante);

    // Progreso
    const sesiones = await prisma.levelSession.findMany({
      where: { usuarioId: { in: estudiantes.map((s) => s.id) }, nivelId: { in: nivelIds }, completada: true },
      select: { usuarioId: true, nivelId: true, estrellas: true },
    });
    const mapa = new Map<string, number>();
    for (const s of sesiones) { const k = `${s.usuarioId}-${s.nivelId}`; if (!mapa.has(k) || s.estrellas > mapa.get(k)!) mapa.set(k, s.estrellas); }

    const filas = estudiantes.map((s) => {
      const completados = nivelIds.filter((nid) => mapa.has(`${s.id}-${nid}`));
      return {
        id: s.id, nombre: s.nombre,
        completados: completados.length, total: nivelIds.length,
        detalle: niveles.map((n) => ({ nivelId: n.id, nombre: n.nombre, hecho: mapa.has(`${s.id}-${n.id}`), estrellas: mapa.get(`${s.id}-${n.id}`) ?? 0 })),
      };
    });
    return reply.send({ asignacion: { id: a.id, titulo: a.titulo }, niveles, estudiantes: filas });
  });

  // ===================== ESTADÍSTICAS =====================
  fastify.get('/stats', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { aula_id } = request.query as { aula_id?: string };
    const aulaId = aula_id ? parseInt(aula_id, 10) : null;

    const top5 = await prisma.$queryRaw<any[]>`
      WITH mejores AS (SELECT usuario_id, nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE completada GROUP BY usuario_id, nivel_id)
      SELECT u.id, u.nombre, COUNT(m.nivel_id)::int AS niveles, COALESCE(SUM(m.est),0)::int AS estrellas
      FROM usuarios u
      JOIN inscripciones i ON i.estudiante_id = u.id
      JOIN aulas au ON au.id = i.aula_id AND au.docente_id = ${user.id} AND (${aulaId}::int IS NULL OR au.id = ${aulaId})
      LEFT JOIN mejores m ON m.usuario_id = u.id
      WHERE u.rol = 'estudiante'
      GROUP BY u.id, u.nombre ORDER BY estrellas DESC, niveles DESC LIMIT 5`;

    const resumen = (await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id = u.id
        JOIN aulas au ON au.id = i.aula_id AND au.docente_id = ${user.id} AND (${aulaId}::int IS NULL OR au.id = ${aulaId})
        WHERE u.rol = 'estudiante'),
      mejores AS (SELECT usuario_id, nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE completada AND usuario_id IN (SELECT id FROM alumnos) GROUP BY usuario_id, nivel_id)
      SELECT (SELECT COUNT(*)::int FROM alumnos) AS estudiantes,
             COUNT(*)::int AS completados, COALESCE(SUM(est),0)::int AS estrellas FROM mejores`)[0];

    const porMateria = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id = u.id
        JOIN aulas au ON au.id = i.aula_id AND au.docente_id = ${user.id} AND (${aulaId}::int IS NULL OR au.id = ${aulaId})
        WHERE u.rol = 'estudiante'),
      hechos AS (SELECT DISTINCT usuario_id, nivel_id FROM sesiones_nivel WHERE completada AND usuario_id IN (SELECT id FROM alumnos))
      SELECT mu.categoria, COUNT(*)::int AS completados
      FROM hechos h JOIN niveles n ON n.id = h.nivel_id JOIN mundos mu ON mu.id = n.mundo_id
      GROUP BY mu.categoria ORDER BY completados DESC`;

    return reply.send({ top5, resumen, porMateria });
  });

  // ===================== PROFESORES (un docente crea otros docentes) =====================
  fastify.get('/teachers', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const teachers = await prisma.user.findMany({ where: { rol: 'docente' }, select: { id: true, nombre: true, email: true, activo: true }, orderBy: { nombre: 'asc' } });
    return reply.send({ teachers });
  });
  fastify.post('/teachers', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const schema = z.object({
      nombre: z.string().trim().min(2).max(150),
      // El correo se normaliza ANTES de validar: un espacio al copiar-pegar ya no rompe el alta.
      email: z.string().transform(normalizarEmail).pipe(z.string().email()),
      password: z.string().min(4).max(100),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });
    if (await prisma.user.findUnique({ where: { email: r.data.email } })) {
      return reply.code(409).send({ error: `Ya existe una cuenta con el correo ${r.data.email}` });
    }
    const hash = await bcrypt.hash(r.data.password, 10);
    // rol 'docente' → hereda automáticamente todas las capacidades (estas rutas validan por rol).
    const teacher = await prisma.user.create({ data: { nombre: r.data.nombre, email: r.data.email, passwordHash: hash, rol: 'docente' }, select: { id: true, nombre: true, email: true } });
    return reply.code(201).send({ teacher });
  });

  // ===================== BLOQUEAR / DESBLOQUEAR (usa el flag 'activo') =====================
  fastify.post('/students/:id/bloqueo', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { id } = request.params as { id: string };
    const { bloquear } = (request.body ?? {}) as { bloquear?: boolean };
    await prisma.user.update({ where: { id: parseInt(id, 10) }, data: { activo: !bloquear } });
    return reply.send({ ok: true, bloqueado: !!bloquear });
  });
  fastify.post('/classrooms/:id/bloqueo', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { id } = request.params as { id: string };
    const { bloquear } = (request.body ?? {}) as { bloquear?: boolean };
    const ins = await prisma.enrollment.findMany({ where: { aulaId: parseInt(id, 10) }, select: { estudianteId: true } });
    const ids = ins.map((e) => e.estudianteId);
    if (ids.length) await prisma.user.updateMany({ where: { id: { in: ids }, rol: 'estudiante' }, data: { activo: !bloquear } });
    return reply.send({ ok: true, afectados: ids.length, bloqueado: !!bloquear });
  });

  // Cambio MASIVO de contraseña a todos los estudiantes de un grupo (docente dueño o admin).
  fastify.post('/classrooms/:id/reset-passwords', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { id } = request.params as { id: string };
    const aulaId = parseInt(id, 10);

    // El docente solo puede sobre sus propias aulas; el admin, sobre cualquiera.
    const classroom = await prisma.classroom.findFirst({ where: { id: aulaId, docenteId: user.id } });
    if (!classroom && user.rol !== 'admin') return reply.code(403).send({ error: 'Sin acceso a esta aula' });

    const schema = z.object({ password: z.string().min(4).max(100).optional() });
    const r = schema.safeParse(request.body ?? {});
    if (!r.success) return reply.code(400).send({ error: 'Datos inválidos', details: r.error.flatten() });

    const passwordPlano = r.data.password?.trim() || 'codexia123';
    const hashComun = await bcrypt.hash(passwordPlano, 10); // un solo hash para todo el lote

    const ins = await prisma.enrollment.findMany({ where: { aulaId }, select: { estudianteId: true } });
    const ids = ins.map((e) => e.estudianteId);
    let afectados = 0;
    if (ids.length) {
      const res = await prisma.user.updateMany({ where: { id: { in: ids }, rol: 'estudiante' }, data: { passwordHash: hashComun } });
      afectados = res.count;
    }
    return reply.send({ ok: true, afectados, password: passwordPlano });
  });

  // ===================== ASIGNACIÓN MÚLTIPLE (fácil: mundos, materia completa o niveles) =====================
  fastify.post('/assign-multi', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const schema = z.object({
      aula_id: z.number().optional(), estudiante_id: z.number().optional(),
      categoria: z.string().optional(), mundo_ids: z.array(z.number()).optional(), nivel_ids: z.array(z.number()).optional(),
      titulo: z.string().max(200).optional(), fecha_limite: z.string().optional(),
    }).refine((d) => d.aula_id || d.estudiante_id, { message: 'Indica un grupo o un estudiante' });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'Datos inválidos', details: r.error.flatten() });
    const d = r.data;
    let mundoIds = d.mundo_ids ?? [];
    if (d.categoria) { const ws = await prisma.$queryRaw<any[]>`SELECT id FROM mundos WHERE categoria = ${d.categoria}`; mundoIds = [...new Set([...mundoIds, ...ws.map((w) => w.id)])]; }
    const fecha = d.fecha_limite ? new Date(d.fecha_limite) : null;
    let creadas = 0;
    for (const mid of mundoIds) { await prisma.$executeRaw`INSERT INTO asignaciones (docente_id, aula_id, estudiante_id, mundo_id, titulo, fecha_limite) VALUES (${user.id}, ${d.aula_id ?? null}, ${d.estudiante_id ?? null}, ${mid}, ${d.titulo ?? null}, ${fecha})`; creadas++; }
    for (const nid of (d.nivel_ids ?? [])) { await prisma.$executeRaw`INSERT INTO asignaciones (docente_id, aula_id, estudiante_id, nivel_id, titulo, fecha_limite) VALUES (${user.id}, ${d.aula_id ?? null}, ${d.estudiante_id ?? null}, ${nid}, ${d.titulo ?? null}, ${fecha})`; creadas++; }
    return reply.code(201).send({ creadas });
  });

  // ===================== ESTADÍSTICAS AVANZADAS (filtros: grupo, materia, mundo) =====================
  fastify.get('/stats2', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { aula_id, categoria, mundo_id } = request.query as { aula_id?: string; categoria?: string; mundo_id?: string };
    const aulaId = aula_id ? parseInt(aula_id, 10) : null;
    const cat = categoria || null;
    const mundoId = mundo_id ? parseInt(mundo_id, 10) : null;
    const D = user.id; // docente

    const topEstudiantes = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (SELECT DISTINCT u.id, u.nombre, u.activo FROM usuarios u JOIN inscripciones i ON i.estudiante_id=u.id JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId}) WHERE u.rol='estudiante'),
      hechos AS (SELECT DISTINCT s.usuario_id, s.nivel_id, mu.categoria FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id WHERE s.completada AND s.usuario_id IN (SELECT id FROM alumnos) AND (${cat}::text IS NULL OR mu.categoria=${cat}) AND (${mundoId}::int IS NULL OR mu.id=${mundoId}))
      SELECT a.id, a.nombre, a.activo, COUNT(DISTINCT h.nivel_id)::int actividades, COUNT(DISTINCT h.categoria)::int materias
      FROM alumnos a LEFT JOIN hechos h ON h.usuario_id=a.id GROUP BY a.id, a.nombre, a.activo ORDER BY actividades DESC, materias DESC LIMIT 10`;
    const bottomEstudiantes = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (SELECT DISTINCT u.id, u.nombre FROM usuarios u JOIN inscripciones i ON i.estudiante_id=u.id JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId}) WHERE u.rol='estudiante'),
      hechos AS (SELECT DISTINCT s.usuario_id, s.nivel_id, mu.categoria FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id WHERE s.completada AND s.usuario_id IN (SELECT id FROM alumnos) AND (${cat}::text IS NULL OR mu.categoria=${cat}) AND (${mundoId}::int IS NULL OR mu.id=${mundoId}))
      SELECT a.id, a.nombre, COUNT(DISTINCT h.nivel_id)::int actividades, COUNT(DISTINCT h.categoria)::int materias
      FROM alumnos a LEFT JOIN hechos h ON h.usuario_id=a.id GROUP BY a.id, a.nombre ORDER BY actividades ASC, materias ASC LIMIT 5`;
    const topGrupos = await prisma.$queryRaw<any[]>`
      WITH grupos AS (SELECT au.id, au.nombre FROM aulas au WHERE au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})),
      hechos AS (SELECT DISTINCT s.usuario_id, s.nivel_id, mu.categoria FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id WHERE s.completada AND (${cat}::text IS NULL OR mu.categoria=${cat}) AND (${mundoId}::int IS NULL OR mu.id=${mundoId}))
      SELECT g.id, g.nombre, COUNT(DISTINCT (h.usuario_id, h.nivel_id))::int actividades, COUNT(DISTINCT h.categoria)::int materias, COUNT(DISTINCT i.estudiante_id)::int estudiantes
      FROM grupos g LEFT JOIN inscripciones i ON i.aula_id=g.id LEFT JOIN hechos h ON h.usuario_id=i.estudiante_id
      GROUP BY g.id, g.nombre ORDER BY actividades DESC, materias DESC LIMIT 10`;
    const bottomGrupos = await prisma.$queryRaw<any[]>`
      WITH grupos AS (SELECT au.id, au.nombre FROM aulas au WHERE au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})),
      hechos AS (SELECT DISTINCT s.usuario_id, s.nivel_id FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id WHERE s.completada AND (${cat}::text IS NULL OR mu.categoria=${cat}) AND (${mundoId}::int IS NULL OR mu.id=${mundoId}))
      SELECT g.id, g.nombre, COUNT(DISTINCT (h.usuario_id, h.nivel_id))::int actividades, COUNT(DISTINCT i.estudiante_id)::int estudiantes
      FROM grupos g LEFT JOIN inscripciones i ON i.aula_id=g.id LEFT JOIN hechos h ON h.usuario_id=i.estudiante_id
      GROUP BY g.id, g.nombre ORDER BY actividades ASC LIMIT 5`;
    const resumen = (await prisma.$queryRaw<any[]>`
      WITH alumnos AS (SELECT DISTINCT u.id FROM usuarios u JOIN inscripciones i ON i.estudiante_id=u.id JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId}) WHERE u.rol='estudiante'),
      hechos AS (SELECT DISTINCT s.usuario_id, s.nivel_id FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id WHERE s.completada AND s.usuario_id IN (SELECT id FROM alumnos) AND (${cat}::text IS NULL OR mu.categoria=${cat}) AND (${mundoId}::int IS NULL OR mu.id=${mundoId}))
      SELECT (SELECT COUNT(*)::int FROM alumnos) estudiantes, COUNT(*)::int actividades FROM hechos`)[0];
    const porMateria = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (SELECT DISTINCT u.id FROM usuarios u JOIN inscripciones i ON i.estudiante_id=u.id JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId}) WHERE u.rol='estudiante')
      SELECT mu.categoria, COUNT(DISTINCT (s.usuario_id, s.nivel_id))::int completados
      FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id
      WHERE s.completada AND s.usuario_id IN (SELECT id FROM alumnos) GROUP BY mu.categoria ORDER BY completados DESC`;
    return reply.send({ resumen, topEstudiantes, bottomEstudiantes, topGrupos, bottomGrupos, porMateria });
  });

  // ===================== ESTADÍSTICAS 3 (dashboard gráfico: tiempo, grupos, mundos, actividades) =====================
  fastify.get('/stats3', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; rol: string };
    if (!esDocente(user)) return reply.code(403).send({ error: 'Solo docentes' });
    const { aula_id } = request.query as { aula_id?: string };
    const D = user.id;
    const aulaId = aula_id ? parseInt(aula_id, 10) : null;

    // 1) Por estudiante (actividades, estrellas, tiempo). Base para varias vistas.
    const estudiantes = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id, u.nombre, u.activo FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante'),
      mejores AS (SELECT usuario_id, nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE completada AND usuario_id IN (SELECT id FROM alumnos) GROUP BY usuario_id, nivel_id),
      tiempo AS (SELECT usuario_id, SUM(tiempo_segundos)::int seg, MAX(completada_en) ult FROM sesiones_nivel WHERE usuario_id IN (SELECT id FROM alumnos) GROUP BY usuario_id)
      SELECT a.id, a.nombre, a.activo,
             COALESCE(COUNT(m.nivel_id),0)::int actividades,
             COALESCE(SUM(m.est),0)::int estrellas,
             COALESCE(t.seg,0)::int seg,
             t.ult AS ultima
      FROM alumnos a LEFT JOIN mejores m ON m.usuario_id=a.id LEFT JOIN tiempo t ON t.usuario_id=a.id
      GROUP BY a.id, a.nombre, a.activo, t.seg, t.ult
      ORDER BY actividades DESC`;

    const totalEstud = estudiantes.length;
    const activos = estudiantes.filter((e) => e.actividades > 0).length;
    const resumen = {
      estudiantes: totalEstud,
      activos,
      actividadesCompletadas: estudiantes.reduce((a, e) => a + e.actividades, 0),
      estrellas: estudiantes.reduce((a, e) => a + e.estrellas, 0),
      tiempoTotalSeg: estudiantes.reduce((a, e) => a + e.seg, 0),
      promedioActividades: totalEstud ? Math.round(estudiantes.reduce((a, e) => a + e.actividades, 0) / totalEstud) : 0,
    };
    const topEstudiantes = estudiantes.slice(0, 8);
    const topTiempo = [...estudiantes].sort((a, b) => b.seg - a.seg).slice(0, 8);
    const necesitanApoyo = [...estudiantes].sort((a, b) => a.actividades - b.actividades).slice(0, 6);

    // 2) Por grupo: estudiantes, actividades, tiempo.
    const porGrupo = await prisma.$queryRaw<any[]>`
      SELECT au.id, au.nombre,
             COUNT(DISTINCT i.estudiante_id)::int estudiantes,
             COUNT(DISTINCT (s.usuario_id, s.nivel_id)) FILTER (WHERE s.completada)::int actividades,
             COALESCE(SUM(s.tiempo_segundos),0)::int seg
      FROM aulas au
      JOIN inscripciones i ON i.aula_id=au.id
      LEFT JOIN sesiones_nivel s ON s.usuario_id=i.estudiante_id
      WHERE au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
      GROUP BY au.id, au.nombre
      ORDER BY actividades DESC`;

    // 3) Por materia (completados vs total posible).
    const porMateria = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante'),
      hechos AS (SELECT DISTINCT s.usuario_id, s.nivel_id FROM sesiones_nivel s WHERE s.completada AND s.usuario_id IN (SELECT id FROM alumnos)),
      comp AS (SELECT mu.categoria, COUNT(*)::int completados FROM hechos h JOIN niveles n ON n.id=h.nivel_id JOIN mundos mu ON mu.id=n.mundo_id GROUP BY mu.categoria),
      tot AS (SELECT mu.categoria, COUNT(n.id)::int total FROM niveles n JOIN mundos mu ON mu.id=n.mundo_id WHERE n.activo GROUP BY mu.categoria)
      SELECT c.categoria, c.completados, t.total, ${totalEstud}::int AS nalumnos
      FROM comp c JOIN tot t ON t.categoria=c.categoria
      ORDER BY c.completados DESC`;

    // 4) Por mundo (completados, tiempo) + MEJOR estudiante por mundo.
    const porMundo = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante'),
      porUM AS (SELECT s.usuario_id, n.mundo_id, COUNT(DISTINCT s.nivel_id)::int hechos, SUM(s.tiempo_segundos)::int seg
                FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id
                WHERE s.completada AND s.usuario_id IN (SELECT id FROM alumnos)
                GROUP BY s.usuario_id, n.mundo_id),
      agg AS (SELECT mundo_id, SUM(hechos)::int completados, SUM(seg)::int seg FROM porUM GROUP BY mundo_id),
      ranked AS (SELECT p.*, u.nombre, ROW_NUMBER() OVER (PARTITION BY p.mundo_id ORDER BY p.hechos DESC, p.seg ASC) rn FROM porUM p JOIN usuarios u ON u.id=p.usuario_id)
      SELECT m.id, m.nombre, m.icono, m.categoria, a.completados, a.seg,
             r.nombre AS mejor_nombre, r.hechos AS mejor_hechos
      FROM agg a JOIN mundos m ON m.id=a.mundo_id
      LEFT JOIN ranked r ON r.mundo_id=a.mundo_id AND r.rn=1
      ORDER BY a.completados DESC LIMIT 12`;

    // 5) Distribución de estrellas.
    const distRaw = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante'),
      mejores AS (SELECT usuario_id, nivel_id, MAX(estrellas) est FROM sesiones_nivel WHERE completada AND usuario_id IN (SELECT id FROM alumnos) GROUP BY usuario_id, nivel_id)
      SELECT est, COUNT(*)::int c FROM mejores GROUP BY est`;
    const distribucionEstrellas = { 1: 0, 2: 0, 3: 0 } as Record<number, number>;
    for (const r of distRaw) if (r.est >= 1 && r.est <= 3) distribucionEstrellas[r.est] = r.c;

    // 6) Actividad por día (últimos 14 días).
    const diasRaw = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante')
      SELECT to_char(s.completada_en::date, 'YYYY-MM-DD') dia, COUNT(*)::int c
      FROM sesiones_nivel s
      WHERE s.completada AND s.completada_en >= NOW() - INTERVAL '13 days' AND s.usuario_id IN (SELECT id FROM alumnos)
      GROUP BY dia ORDER BY dia`;
    const mapaDia = new Map(diasRaw.map((d) => [d.dia, d.c]));
    const actividadPorDia: { dia: string; c: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      actividadPorDia.push({ dia: key, c: mapaDia.get(key) ?? 0 });
    }

    // 7) Actividades más completadas y más difíciles (por nivel).
    const actividadesTop = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante'),
      hechos AS (SELECT DISTINCT usuario_id, nivel_id FROM sesiones_nivel WHERE completada AND usuario_id IN (SELECT id FROM alumnos))
      SELECT n.nombre, mu.icono, mu.nombre AS mundo, COUNT(*)::int c
      FROM hechos h JOIN niveles n ON n.id=h.nivel_id JOIN mundos mu ON mu.id=n.mundo_id
      GROUP BY n.id, n.nombre, mu.icono, mu.nombre ORDER BY c DESC LIMIT 8`;

    const actividadesReto = await prisma.$queryRaw<any[]>`
      WITH alumnos AS (
        SELECT DISTINCT u.id FROM usuarios u
        JOIN inscripciones i ON i.estudiante_id=u.id
        JOIN aulas au ON au.id=i.aula_id AND au.docente_id=${D} AND (${aulaId}::int IS NULL OR au.id=${aulaId})
        WHERE u.rol='estudiante')
      SELECT n.nombre, mu.icono, mu.nombre AS mundo,
             COUNT(DISTINCT s.usuario_id)::int intentaron,
             COUNT(DISTINCT s.usuario_id) FILTER (WHERE s.completada)::int completaron
      FROM sesiones_nivel s JOIN niveles n ON n.id=s.nivel_id JOIN mundos mu ON mu.id=n.mundo_id
      WHERE s.usuario_id IN (SELECT id FROM alumnos)
      GROUP BY n.id, n.nombre, mu.icono, mu.nombre
      HAVING COUNT(DISTINCT s.usuario_id) >= 1 AND COUNT(DISTINCT s.usuario_id) FILTER (WHERE s.completada) < COUNT(DISTINCT s.usuario_id)
      ORDER BY (COUNT(DISTINCT s.usuario_id) FILTER (WHERE s.completada))::float / NULLIF(COUNT(DISTINCT s.usuario_id),0) ASC, intentaron DESC LIMIT 8`;

    return reply.send({
      resumen, estudiantes, topEstudiantes, topTiempo, necesitanApoyo,
      porGrupo, porMateria, porMundo, distribucionEstrellas, actividadPorDia, actividadesTop, actividadesReto,
    });
  });
};
