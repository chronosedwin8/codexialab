import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { authRoutes } from './routes/auth.js';
import { curriculumRoutes } from './routes/curriculum.js';
import { sessionRoutes } from './routes/sessions.js';
import { submissionRoutes } from './routes/submissions.js';
import { storeRoutes } from './routes/store.js';
import { teacherRoutes } from './routes/teacher.js';
import { juegosRoutes } from './routes/juegos.js';
import { pagosRoutes } from './routes/pagos.js';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { existsSync } from 'fs';

// Carpeta del frontend construido (vite build). Si existe, el backend la sirve en el mismo puerto.
const FRONT_DIST = resolve(dirname(fileURLToPath(import.meta.url)), '../../frontend/dist');

// Sitio de marketing/ventas (estático, SEO). Se sirve en /web para que el checkout de
// Mercado Pago corra sobre http(s) y hable con la API del mismo origen (sin CORS).
const HOMEPAGE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../../homepage');

// Augment fastify types
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: any, reply: any) => Promise<void>;
    requireDocente: (request: any, reply: any) => Promise<void>;
  }
}

const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
});

async function bootstrap() {
  await server.register(helmet, {
    contentSecurityPolicy: false,
  });

  await server.register(cors, {
    origin: process.env.NODE_ENV === 'production'
      ? ['https://codexialab.com', 'https://www.codexialab.com']
      : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  });

  await server.register(jwt, {
    secret: process.env.JWT_SECRET ?? 'codexia_fallback_secret',
    sign: { expiresIn: '7d' },
  });

  // Decorator para rutas protegidas
  server.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: 'Token inválido o expirado' });
    }
  });

  // Decorator para verificar rol docente
  server.decorate('requireDocente', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      if (request.user.rol !== 'docente' && request.user.rol !== 'admin') {
        reply.code(403).send({ error: 'Prohibido', message: 'Se requiere rol docente' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado' });
    }
  });

  // Rutas
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(curriculumRoutes, { prefix: '/api/curriculum' });
  await server.register(sessionRoutes, { prefix: '/api/sessions' });
  await server.register(submissionRoutes, { prefix: '/api/submissions' });
  await server.register(storeRoutes, { prefix: '/api/store' });
  await server.register(teacherRoutes, { prefix: '/api/teacher' });
  await server.register(juegosRoutes, { prefix: '/api/juegos' });
  await server.register(pagosRoutes, { prefix: '/api/pagos' });

  // App Vue construida (base /app/) servida bajo /app. wildcard:false → sirve archivos reales
  // y deja las rutas del SPA al fallback de abajo. decorateReply:false: el decorador sendFile
  // lo aporta el estático de la homepage.
  if (existsSync(FRONT_DIST)) {
    await server.register(fastifyStatic, { root: FRONT_DIST, prefix: '/app/', wildcard: false, decorateReply: false });
    server.log.info(`App Vue servida desde ${FRONT_DIST} en /app/`);
  }

  // Homepage de ventas (estática) en la RAÍZ del dominio. Sirve index.html, planes.html, css/, js/…
  // (También queda accesible en /web/ por compatibilidad.)
  if (existsSync(HOMEPAGE_DIR)) {
    await server.register(fastifyStatic, { root: HOMEPAGE_DIR, prefix: '/', wildcard: false });
    await server.register(fastifyStatic, { root: HOMEPAGE_DIR, prefix: '/web/', wildcard: false, decorateReply: false });
    server.log.info(`Homepage servida desde ${HOMEPAGE_DIR} en /`);
  }

  // Health check
  server.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  }));

  // Error handler global
  server.setErrorHandler((error, request, reply) => {
    server.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.code(statusCode).send({
      error: error.name ?? 'Error interno',
      message: error.message ?? 'Algo salió mal',
      statusCode,
    });
  });

  // Not found handler:
  //  - GET /app/*  → index.html del SPA (vue-router history mode) desde FRONT_DIST.
  //  - GET resto (no /api) → index.html de la homepage (incluye la raíz "/").
  //  - /api inexistente o no-GET → 404 JSON.
  server.setNotFoundHandler((request, reply) => {
    if (request.raw.method === 'GET' && !request.url.startsWith('/api')) {
      if (request.url.startsWith('/app') && existsSync(FRONT_DIST)) {
        return reply.sendFile('index.html', FRONT_DIST);
      }
      if (existsSync(HOMEPAGE_DIR)) {
        return reply.sendFile('index.html', HOMEPAGE_DIR);
      }
    }
    reply.code(404).send({
      error: 'No encontrado',
      message: `La ruta ${request.url} no existe`,
    });
  });

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await server.listen({ port, host: '0.0.0.0' });
  server.log.info(`Codexia API corriendo en http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
