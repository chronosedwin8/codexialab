import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nombre: z.string().min(2).max(150),
  rol: z.enum(['estudiante', 'docente', 'admin']).default('estudiante'),
  banda_edad: z.enum(['exploradores', 'aventureros', 'heroes']).optional(),
  fecha_nacimiento: z.string().optional(),
  institucion_id: z.number().optional(),
  nombre_tutor: z.string().optional(),
  email_tutor: z.string().email().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const consentSchema = z.object({
  usuario_id: z.number(),
  nombre_tutor: z.string().min(2),
  email_tutor: z.string().email(),
  acepta: z.boolean(),
});

export const authRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/register', async (request, reply) => {
    const result = registerSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() });
    }

    const data = result.data;

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.code(409).send({ error: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    // Menores de edad requieren consentimiento
    let needsConsent = false;
    if (data.fecha_nacimiento) {
      const birth = new Date(data.fecha_nacimiento);
      const age = Math.floor((Date.now() - birth.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
      needsConsent = age < 18;
    }

    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        nombre: data.nombre,
        rol: data.rol as any,
        bandaEdad: data.banda_edad as any,
        fechaNacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : undefined,
        institucionId: data.institucion_id,
        nombreTutor: data.nombre_tutor,
        emailTutor: data.email_tutor,
        consentimientoTutor: !needsConsent,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        bandaEdad: true,
        modalidadPref: true,
        avatarConfig: true,
        monedas: true,
        gemas: true,
        consentimientoTutor: true,
      },
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    });

    return reply.code(201).send({
      token,
      user,
      needsConsent,
    });
  });

  fastify.post('/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos' });
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        nombre: true,
        rol: true,
        bandaEdad: true,
        modalidadPref: true,
        avatarConfig: true,
        monedas: true,
        gemas: true,
        rachaDias: true,
        activo: true,
        consentimientoTutor: true,
        institucionId: true,
      },
    });

    if (!user || !user.activo) {
      return reply.code(401).send({ error: 'Credenciales incorrectas' });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      return reply.code(401).send({ error: 'Credenciales incorrectas' });
    }

    // Actualizar racha y última actividad
    await prisma.user.update({
      where: { id: user.id },
      data: { ultimaActividad: new Date() },
    });

    const token = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    });

    const { passwordHash, ...userWithoutPassword } = user;

    return reply.send({ token, user: userWithoutPassword });
  });

  // Acceso a la sección PREESCOLAR sin login: los niños aún no manejan correo/clave.
  // Conociendo la ruta /preescolar se obtiene un token de una cuenta invitada compartida.
  fastify.post('/preescolar', async (_request, reply) => {
    const email = 'preescolar@codexia.local';
    let user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, nombre: true, rol: true, bandaEdad: true, modalidadPref: true, avatarConfig: true, monedas: true, gemas: true, rachaDias: true, institucionId: true, consentimientoTutor: true },
    });
    if (!user) {
      const passwordHash = await bcrypt.hash('preescolar-' + Math.random().toString(36).slice(2), 10);
      user = await prisma.user.create({
        data: {
          email, passwordHash, nombre: 'Pequeño Explorador',
          rol: 'estudiante', bandaEdad: 'exploradores',
          consentimientoTutor: true, activo: true,
        },
        select: { id: true, email: true, nombre: true, rol: true, bandaEdad: true, modalidadPref: true, avatarConfig: true, monedas: true, gemas: true, rachaDias: true, institucionId: true, consentimientoTutor: true },
      });
    }
    const token = fastify.jwt.sign({ id: user.id, email: user.email, rol: user.rol, nombre: user.nombre });
    return reply.send({ token, user });
  });

  fastify.post('/refresh', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number; email: string; rol: string; nombre: string };
    const newToken = fastify.jwt.sign({
      id: user.id,
      email: user.email,
      rol: user.rol,
      nombre: user.nombre,
    });
    return reply.send({ token: newToken });
  });

  fastify.get('/me', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const jwtUser = request.user as { id: number };
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.id },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        bandaEdad: true,
        modalidadPref: true,
        avatarConfig: true,
        monedas: true,
        gemas: true,
        rachaDias: true,
        institucionId: true,
        consentimientoTutor: true,
        _count: {
          select: { sesiones: { where: { completada: true } }, logros: true },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    return reply.send({ user });
  });

  fastify.post('/consent', async (request, reply) => {
    const result = consentSchema.safeParse(request.body);
    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() });
    }

    const { usuario_id, nombre_tutor, email_tutor, acepta } = result.data;

    if (!acepta) {
      return reply.code(400).send({ error: 'El tutor debe aceptar el consentimiento para continuar (Ley 1581)' });
    }

    await prisma.user.update({
      where: { id: usuario_id },
      data: {
        nombreTutor: nombre_tutor,
        emailTutor: email_tutor,
        consentimientoTutor: true,
        fechaConsentimiento: new Date(),
      },
    });

    return reply.send({ ok: true, message: 'Consentimiento registrado correctamente (Ley 1581 Colombia)' });
  });
};
