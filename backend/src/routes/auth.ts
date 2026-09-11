import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import {
  AUTO_CREAR,
  canjearCodigo,
  dominioPermitido,
  dominiosPermitidos,
  leerIdToken,
  redirectUri,
  ssoConfigurado,
  urlAutorizacion,
} from '../lib/microsoft.js';
import { IMAGENES_PIN, LONGITUD_PIN, pinValido, verificarPin } from '../lib/pin.js';
import {
  anotarFallo,
  anotarFalloIp,
  comprobarIntentos,
  comprobarIntentosIp,
  olvidarFallos,
} from '../lib/intentos.js';

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

  // ─────────────────────────────────────────────────────────────────────────
  // SSO con Microsoft Entra ID (cuentas institucionales del colegio)
  // ─────────────────────────────────────────────────────────────────────────

  /** Base pública del sitio; con ella se arma la redirect_uri registrada en Azure. */
  function baseUrl(request: { protocol: string; hostname: string; headers: Record<string, unknown> }): string {
    const configurada = (process.env.PUBLIC_BASE_URL ?? '').trim().replace(/\/+$/, '');
    if (configurada) return configurada;
    // Detrás del proxy de Coolify el protocolo real viaja en x-forwarded-proto.
    const proto = String(request.headers['x-forwarded-proto'] ?? request.protocol ?? 'http').split(',')[0];
    const host = String(request.headers['x-forwarded-host'] ?? request.headers.host ?? request.hostname);
    return `${proto}://${host}`;
  }

  /** ¿Está el SSO disponible? Lo consulta el frontend para mostrar o no el botón. */
  fastify.get('/microsoft/estado', async (_request, reply) =>
    reply.send({ disponible: ssoConfigurado(), dominios: dominiosPermitidos() }),
  );

  // Paso 1: manda al usuario a iniciar sesión en Microsoft.
  fastify.get('/microsoft', async (request, reply) => {
    if (!ssoConfigurado()) {
      return reply.code(503).send({ error: 'El inicio de sesión con Microsoft no está configurado en este servidor' });
    }

    const nonce = randomUUID();
    // El state va FIRMADO y con vencimiento corto: así se verifica que la
    // respuesta de Microsoft corresponde a una petición nuestra (anti-CSRF) y
    // se transporta el nonce sin necesidad de cookies ni estado en memoria
    // (el servidor puede reiniciarse o haber varias instancias).
    const state = fastify.jwt.sign({ nonce, sso: 'ms' }, { expiresIn: '10m' });

    return reply.redirect(
      urlAutorizacion({ state, nonce, redirectUri: redirectUri(baseUrl(request as never)) }),
    );
  });

  // Paso 2: Microsoft devuelve el código aquí. Esta URL es la que se registra en Azure.
  fastify.get('/microsoft/callback', async (request, reply) => {
    const q = request.query as Record<string, string | undefined>;
    const destino = (motivo: string) => `${baseUrl(request as never)}/app/?sso_error=${encodeURIComponent(motivo)}`;

    if (!ssoConfigurado()) return reply.redirect(destino('no_configurado'));

    // Microsoft informa los errores del usuario (canceló, sin consentimiento…) por query.
    if (q.error) {
      request.log.warn({ error: q.error, desc: q.error_description }, 'SSO Microsoft devolvió error');
      return reply.redirect(destino(q.error === 'access_denied' ? 'cancelado' : 'microsoft'));
    }
    if (!q.code || !q.state) return reply.redirect(destino('respuesta_incompleta'));

    let nonce: string;
    try {
      const st = fastify.jwt.verify(q.state) as { nonce?: string; sso?: string };
      if (st.sso !== 'ms' || !st.nonce) throw new Error('state ajeno');
      nonce = st.nonce;
    } catch {
      return reply.redirect(destino('state_invalido'));
    }

    let perfil;
    try {
      const { id_token } = await canjearCodigo(q.code, redirectUri(baseUrl(request as never)));
      perfil = leerIdToken(id_token, nonce);
    } catch (e) {
      request.log.error({ err: e }, 'Falló el canje/validación del SSO de Microsoft');
      return reply.redirect(destino('validacion'));
    }

    if (!dominioPermitido(perfil.email)) {
      request.log.warn({ email: perfil.email }, 'SSO rechazado: dominio no institucional');
      return reply.redirect(destino('dominio'));
    }

    // Se busca por correo: los estudiantes importados de Phidias ya tienen su
    // correo institucional, así que entran a SU cuenta con su progreso y grupo.
    let user = await prisma.user.findUnique({
      where: { email: perfil.email },
      select: { id: true, email: true, nombre: true, rol: true, activo: true },
    });

    if (!user) {
      if (!AUTO_CREAR) return reply.redirect(destino('sin_cuenta'));
      // Cuenta nueva: entra como estudiante. La clave es aleatoria porque esta
      // cuenta se usa por SSO; no hay contraseña que el estudiante deba saber.
      const passwordHash = await bcrypt.hash(`ms-sso-${randomUUID()}`, 10);
      user = await prisma.user.create({
        data: {
          email: perfil.email,
          nombre: perfil.nombre,
          passwordHash,
          rol: 'estudiante',
          bandaEdad: 'aventureros',
          consentimientoTutor: true, // cuenta institucional gestionada por el colegio
          activo: true,
        },
        select: { id: true, email: true, nombre: true, rol: true, activo: true },
      });
      request.log.info({ email: perfil.email }, 'SSO Microsoft: cuenta de estudiante creada');
    }

    if (!user.activo) return reply.redirect(destino('bloqueado'));

    await prisma.user.update({ where: { id: user.id }, data: { ultimaActividad: new Date() } });

    const token = fastify.jwt.sign({ id: user.id, email: user.email, rol: user.rol, nombre: user.nombre });

    // El token viaja una sola vez por la URL; el frontend lo guarda y limpia la
    // barra de direcciones enseguida (history.replaceState).
    return reply.redirect(`${baseUrl(request as never)}/app/?sso_token=${encodeURIComponent(token)}`);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Acceso de los más pequeños: usuario + PIN de cuatro imágenes
  // ─────────────────────────────────────────────────────────────────────────

  /** El catálogo de dibujos, para que la pantalla los pinte en el mismo orden. */
  fastify.get('/imagenes-pin', async (_request, reply) =>
    reply.send({ imagenes: IMAGENES_PIN, longitud: LONGITUD_PIN }),
  );

  /**
   * Inicio de sesión de un niño con su PIN de imágenes.
   *
   * La protección tiene dos capas, porque una sola no sirve:
   *  - un contador de fallos por cuenta, para que no se pueda adivinar el PIN de
   *    un niño concreto a base de intentos,
   *  - y otro por IP, para frenar a quien recorre nombres de usuario probando
   *    uno cada vez (cada cuenta acumularía un solo fallo y ninguna llegaría al
   *    tope). Solo cuentan los fallos, así que un aula entera entrando bien
   *    nunca los activa.
   */
  fastify.post('/login-nino', async (request, reply) => {
    const schema = z.object({
      usuario: z.string().trim().min(2).max(60).transform((u) => u.toLowerCase()),
      pin: z.array(z.string()).length(LONGITUD_PIN),
    });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'Faltan el nombre de jugador o los cuatro dibujos' });

    const { usuario, pin } = r.data;
    if (!pinValido(pin)) return reply.code(400).send({ error: 'Esos dibujos no son válidos' });

    const estado = comprobarIntentos(usuario);
    if (estado.bloqueado) {
      return reply.code(429).send({
        error: 'Demasiados intentos',
        mensaje: `Espera ${Math.ceil(estado.esperaSegundos / 60)} minuto(s) y vuelve a intentarlo.`,
      });
    }
    const estadoRed = comprobarIntentosIp(request.ip);
    if (estadoRed.bloqueado) {
      return reply.code(429).send({
        error: 'Demasiados intentos desde esta red',
        mensaje: 'Pide ayuda a tu profe o a un adulto.',
      });
    }

    const nino = await prisma.user.findUnique({
      where: { usuario },
      select: {
        id: true, email: true, nombre: true, rol: true, bandaEdad: true, modalidadPref: true,
        avatarConfig: true, monedas: true, gemas: true, rachaDias: true, institucionId: true,
        consentimientoTutor: true, activo: true, pinHash: true,
      },
    });

    // El mismo mensaje si el usuario no existe o si el PIN no coincide: así no
    // se revela qué cuentas existen.
    const generico = { error: 'Ese nombre o esos dibujos no coinciden' };
    if (!nino?.pinHash || nino.rol !== 'estudiante' || !nino.activo) {
      anotarFallo(usuario);
      anotarFalloIp(request.ip);
      return reply.code(401).send(generico);
    }

    if (!(await verificarPin(pin, nino.pinHash))) {
      const tras = anotarFallo(usuario);
      anotarFalloIp(request.ip);
      if (tras.bloqueado) {
        return reply.code(429).send({
          error: 'Demasiados intentos',
          mensaje: 'Pide ayuda a un adulto para recordar tus dibujos.',
        });
      }
      return reply.code(401).send(generico);
    }

    // Acceso correcto: se olvidan los fallos anteriores.
    olvidarFallos(usuario);
    await prisma.user.update({ where: { id: nino.id }, data: { ultimaActividad: new Date() } });

    const token = fastify.jwt.sign({ id: nino.id, email: nino.email, rol: nino.rol, nombre: nino.nombre });
    const { pinHash, ...usuarioSinPin } = nino;
    return reply.send({ token, user: usuarioSinPin });
  });
};
