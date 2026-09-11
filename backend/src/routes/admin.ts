/**
 * Panel de administración: control total sobre las cuentas del sistema.
 *
 * El panel docente administra un aula; esto administra el colegio entero. Un
 * administrador ve TODAS las cuentas —estudiantes, profesores y otros
 * administradores—, las busca, les cambia la contraseña, les cambia el rol y
 * las elimina.
 *
 * Todo aquí exige rol `admin`. Las tres barreras que NO se pueden saltar son
 * contra el error humano, no contra un intruso: nadie puede quitarse a sí mismo
 * el rol, desactivarse ni borrarse, y el sistema nunca se queda sin ningún
 * administrador activo. Sin eso, un clic deja el colegio sin quien administre.
 */
import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { PrismaClient, type RolUsuario } from '@prisma/client';

const prisma = new PrismaClient();

/** Cuenta invitada compartida de Preescolar: no es de una persona. */
const CUENTA_INVITADA = 'preescolar@codexia.local';

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function mensajeValidacion(error: z.ZodError): string {
  const primero = error.issues[0];
  if (!primero) return 'Revisa los datos del formulario';
  const campo = String(primero.path[0] ?? '');
  const etiquetas: Record<string, string> = {
    nombre: 'El nombre', email: 'El correo', password: 'La contraseña', rol: 'El rol',
  };
  const etiqueta = etiquetas[campo] ?? 'El dato';
  if (primero.code === 'invalid_string') return 'El correo no es válido. Revisa que no tenga espacios ni le falte el @';
  if (primero.code === 'too_small') {
    return `${etiqueta} debe tener al menos ${(primero as { minimum?: number }).minimum ?? 0} caracteres`;
  }
  if (primero.code === 'invalid_enum_value') return 'Ese rol no existe';
  return `${etiqueta} no es válido`;
}

export const adminRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  /** Puerta única: todo lo de este módulo es solo para administradores. */
  fastify.addHook('preHandler', async (request, reply) => {
    await fastify.authenticate(request, reply);
    const user = request.user as { rol?: string } | undefined;
    if (user?.rol !== 'admin') {
      return reply.code(403).send({ error: 'Solo un administrador puede entrar aquí' });
    }
  });

  /** Cuántos administradores activos quedan además de este. */
  async function otrosAdminsActivos(exceptoId: number): Promise<number> {
    return prisma.user.count({ where: { rol: 'admin', activo: true, NOT: { id: exceptoId } } });
  }

  // ───────────────────────────── Resumen ─────────────────────────────

  fastify.get('/resumen', async (_request, reply) => {
    const [porRol, aulas, sedes, conPin, bloqueados] = await Promise.all([
      prisma.user.groupBy({ by: ['rol'], _count: { _all: true } }),
      prisma.classroom.count(),
      prisma.institution.count({ where: { activa: true } }),
      prisma.user.count({ where: { pinHash: { not: null } } }),
      prisma.user.count({ where: { activo: false } }),
    ]);
    const conteo = Object.fromEntries(porRol.map((r) => [r.rol, r._count._all]));
    return reply.send({
      estudiantes: conteo.estudiante ?? 0,
      docentes: conteo.docente ?? 0,
      admins: conteo.admin ?? 0,
      aulas, sedes, conPin, bloqueados,
    });
  });

  // ──────────────────────────── Usuarios ────────────────────────────

  /** Todas las cuentas del sistema, con búsqueda y filtro por rol. */
  fastify.get('/usuarios', async (request, reply) => {
    const { q, rol, limite } = request.query as { q?: string; rol?: string; limite?: string };
    const roles: RolUsuario[] = ['estudiante', 'docente', 'admin'];
    const take = Math.min(Math.max(parseInt(limite ?? '200', 10) || 200, 1), 500);

    const usuarios = await prisma.user.findMany({
      where: {
        ...(rol && roles.includes(rol as RolUsuario) ? { rol: rol as RolUsuario } : {}),
        ...(q
          ? {
              OR: [
                { nombre: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { usuario: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true, nombre: true, email: true, usuario: true, rol: true, bandaEdad: true,
        activo: true, monedas: true, ultimaActividad: true, creadoEn: true,
        institucion: { select: { id: true, nombre: true } },
        pinHash: true,
        _count: { select: { inscripciones: true, aulas: true, sesiones: true } },
      },
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
      take,
    });

    return reply.send({
      usuarios: usuarios.map(({ pinHash, _count, ...u }) => ({
        ...u,
        // El hash nunca sale; solo si la cuenta tiene acceso por dibujos.
        tienePin: pinHash !== null,
        grupos: _count.inscripciones,
        gruposQueDirige: _count.aulas,
        sesiones: _count.sesiones,
        esCuentaInvitada: u.email === CUENTA_INVITADA,
      })),
      total: usuarios.length,
      limite: take,
    });
  });

  /** Ficha de una cuenta: sus grupos y, si dirige aulas, cuáles. */
  fastify.get('/usuarios/:id', async (request, reply) => {
    const id = parseInt((request.params as { id: string }).id, 10);
    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true, nombre: true, email: true, usuario: true, rol: true, bandaEdad: true,
        activo: true, monedas: true, gemas: true, rachaDias: true, ultimaActividad: true, creadoEn: true,
        institucion: { select: { id: true, nombre: true } },
        pinHash: true,
        inscripciones: { select: { aula: { select: { id: true, nombre: true } } } },
        aulas: { select: { id: true, nombre: true, _count: { select: { inscripciones: true } } } },
      },
    });
    if (!u) return reply.code(404).send({ error: 'Esa cuenta no existe' });

    const { pinHash, inscripciones, aulas, ...resto } = u;
    return reply.send({
      usuario: {
        ...resto,
        tienePin: pinHash !== null,
        grupos: inscripciones.map((i) => i.aula),
        dirige: aulas,
      },
    });
  });

  /** Crea cualquier cuenta, del rol que sea. */
  fastify.post('/usuarios', async (request, reply) => {
    const schema = z.object({
      nombre: z.string().trim().min(2).max(150),
      email: z.string().transform(normalizarEmail).pipe(z.string().email()),
      password: z.string().min(4).max(100),
      rol: z.enum(['estudiante', 'docente', 'admin']),
      banda_edad: z.enum(['exploradores', 'aventureros', 'heroes']).optional(),
      institucion_id: z.number().nullable().optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });

    if (await prisma.user.findUnique({ where: { email: r.data.email } })) {
      return reply.code(409).send({ error: `Ya existe una cuenta con el correo ${r.data.email}` });
    }

    const usuario = await prisma.user.create({
      data: {
        nombre: r.data.nombre,
        email: r.data.email,
        passwordHash: await bcrypt.hash(r.data.password, 10),
        rol: r.data.rol,
        bandaEdad: r.data.rol === 'estudiante' ? (r.data.banda_edad ?? 'aventureros') : null,
        institucionId: r.data.institucion_id ?? null,
      },
      select: { id: true, nombre: true, email: true, rol: true },
    });
    request.log.info({ id: usuario.id, rol: usuario.rol }, 'Cuenta creada desde administración');
    return reply.code(201).send({ usuario });
  });

  /** Edita nombre, correo, rol, banda, sede y estado de cualquier cuenta. */
  fastify.patch('/usuarios/:id', async (request, reply) => {
    const actor = request.user as { id: number };
    const id = parseInt((request.params as { id: string }).id, 10);

    const schema = z.object({
      nombre: z.string().trim().min(2).max(150).optional(),
      email: z.string().transform(normalizarEmail).pipe(z.string().email()).optional(),
      rol: z.enum(['estudiante', 'docente', 'admin']).optional(),
      banda_edad: z.enum(['exploradores', 'aventureros', 'heroes']).nullable().optional(),
      institucion_id: z.number().nullable().optional(),
      activo: z.boolean().optional(),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: mensajeValidacion(r.error) });

    const actual = await prisma.user.findUnique({ where: { id }, select: { id: true, rol: true, email: true, nombre: true } });
    if (!actual) return reply.code(404).send({ error: 'Esa cuenta no existe' });

    // Barreras contra el error humano.
    if (id === actor.id && r.data.rol && r.data.rol !== 'admin') {
      return reply.code(400).send({ error: 'No puedes quitarte a ti mismo el rol de administrador' });
    }
    if (id === actor.id && r.data.activo === false) {
      return reply.code(400).send({ error: 'No puedes desactivar tu propia cuenta' });
    }
    const dejaDeSerAdmin = actual.rol === 'admin' && ((r.data.rol && r.data.rol !== 'admin') || r.data.activo === false);
    if (dejaDeSerAdmin && (await otrosAdminsActivos(id)) === 0) {
      return reply.code(409).send({ error: 'Es el único administrador activo. Nombra otro antes de cambiarlo.' });
    }

    if (r.data.email && r.data.email !== actual.email) {
      const chocaCon = await prisma.user.findUnique({ where: { email: r.data.email }, select: { id: true } });
      if (chocaCon && chocaCon.id !== id) {
        return reply.code(409).send({ error: `Ya existe otra cuenta con el correo ${r.data.email}` });
      }
    }

    // Un docente o admin no lleva banda de edad; al degradar a estudiante se le pone una.
    let banda = r.data.banda_edad;
    if (r.data.rol && r.data.rol !== 'estudiante') banda = null;
    if (r.data.rol === 'estudiante' && banda === undefined) banda = 'aventureros';

    const usuario = await prisma.user.update({
      where: { id },
      data: {
        ...(r.data.nombre !== undefined ? { nombre: r.data.nombre } : {}),
        ...(r.data.email !== undefined ? { email: r.data.email } : {}),
        ...(r.data.rol !== undefined ? { rol: r.data.rol } : {}),
        ...(banda !== undefined ? { bandaEdad: banda } : {}),
        ...(r.data.institucion_id !== undefined ? { institucionId: r.data.institucion_id } : {}),
        ...(r.data.activo !== undefined ? { activo: r.data.activo } : {}),
      },
      select: { id: true, nombre: true, email: true, rol: true, activo: true, bandaEdad: true },
    });

    await prisma.accessAudit.create({
      data: {
        actorId: actor.id, alumnoId: id, accion: 'editar_cuenta',
        recurso: `usuario:${id} ${Object.keys(r.data).join(',')}`, ip: request.ip,
      },
    }).catch(() => { /* la auditoría nunca tumba la operación */ });

    return reply.send({ usuario });
  });

  /** Cambia la contraseña de cualquier cuenta, profesores y admins incluidos. */
  fastify.post('/usuarios/:id/password', async (request, reply) => {
    const actor = request.user as { id: number };
    const id = parseInt((request.params as { id: string }).id, 10);

    const schema = z.object({ password: z.string().min(4).max(100) });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'La contraseña debe tener al menos 4 caracteres' });

    const destino = await prisma.user.findUnique({ where: { id }, select: { id: true, nombre: true, email: true, rol: true } });
    if (!destino) return reply.code(404).send({ error: 'Esa cuenta no existe' });

    await prisma.user.update({ where: { id }, data: { passwordHash: await bcrypt.hash(r.data.password, 10) } });

    await prisma.accessAudit.create({
      data: {
        actorId: actor.id, alumnoId: id, accion: 'cambiar_password',
        recurso: `usuario:${id} (${destino.rol})`, ip: request.ip,
      },
    }).catch(() => { /* noop */ });

    request.log.warn({ id, por: actor.id }, 'Contraseña cambiada desde administración');
    return reply.send({ ok: true, nombre: destino.nombre, email: destino.email });
  });

  /** Elimina cualquier cuenta. */
  fastify.delete('/usuarios/:id', async (request, reply) => {
    const actor = request.user as { id: number };
    const id = parseInt((request.params as { id: string }).id, 10);
    if (id === actor.id) return reply.code(400).send({ error: 'No puedes eliminar tu propia cuenta' });

    const destino = await prisma.user.findUnique({
      where: { id },
      select: { id: true, nombre: true, email: true, rol: true, _count: { select: { aulas: true, sesiones: true } } },
    });
    if (!destino) return reply.code(404).send({ error: 'Esa cuenta no existe' });
    if (destino.email === CUENTA_INVITADA) {
      return reply.code(400).send({ error: 'La cuenta compartida de Preescolar no se puede eliminar' });
    }
    if (destino.rol === 'admin' && (await otrosAdminsActivos(id)) === 0) {
      return reply.code(409).send({ error: 'Es el único administrador activo. Nombra otro antes de eliminarlo.' });
    }
    // En la BD `aulas.docente_id` es ON DELETE CASCADE: borrar al docente se
    // llevaría sus grupos por delante. Se exige vaciarlos antes, a propósito.
    if (destino._count.aulas > 0) {
      return reply.code(409).send({
        error: `${destino.nombre} dirige ${destino._count.aulas} grupo(s). Elimínalos o pásalos a otro profesor antes de borrar la cuenta.`,
      });
    }

    await prisma.user.delete({ where: { id } });
    await prisma.accessAudit.create({
      data: { actorId: actor.id, accion: 'eliminar_cuenta', recurso: `${destino.rol}:${destino.email}`, ip: request.ip },
    }).catch(() => { /* noop */ });

    request.log.warn({ id, email: destino.email, por: actor.id }, 'Cuenta eliminada desde administración');
    return reply.send({ ok: true, nombre: destino.nombre, sesionesBorradas: destino._count.sesiones });
  });

  // ──────────────────────────── Auditoría ────────────────────────────

  /** Quién tocó qué. Existe porque aquí se manejan credenciales de menores. */
  fastify.get('/auditoria', async (request, reply) => {
    const { limite } = request.query as { limite?: string };
    const take = Math.min(Math.max(parseInt(limite ?? '100', 10) || 100, 1), 500);

    const registros = await prisma.accessAudit.findMany({ orderBy: { creadoEn: 'desc' }, take });
    const ids = [...new Set(registros.flatMap((r) => [r.actorId, r.alumnoId]).filter((v): v is number => v !== null))];
    const personas = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, nombre: true } });
    const nombre = new Map(personas.map((p) => [p.id, p.nombre]));

    return reply.send({
      registros: registros.map((r) => ({
        id: r.id,
        accion: r.accion,
        recurso: r.recurso,
        ip: r.ip,
        creadoEn: r.creadoEn,
        actor: r.actorId ? (nombre.get(r.actorId) ?? `#${r.actorId}`) : 'cuenta eliminada',
        sobre: r.alumnoId ? (nombre.get(r.alumnoId) ?? `#${r.alumnoId}`) : null,
      })),
    });
  });
};
