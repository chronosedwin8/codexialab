import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Zona de Juegos: ranking compartido + records individuales con fecha/hora.
export const juegosRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Top de mejores estudiantes (uno por estudiante, su mejor puntaje). Público: lo ven todos.
  fastify.get('/:juego/top', async (request, reply) => {
    const { juego } = request.params as { juego: string };
    const { limit } = request.query as { limit?: string };
    const n = Math.min(20, Math.max(1, parseInt(limit || '5', 10)));
    const top = await prisma.$queryRaw<any[]>`
      SELECT nombre, puntos, mundo, creado_en AS fecha FROM (
        SELECT DISTINCT ON (usuario_id) usuario_id, nombre, puntos, mundo, creado_en
        FROM puntajes_juego WHERE juego = ${juego}
        ORDER BY usuario_id, puntos DESC, creado_en ASC
      ) t ORDER BY puntos DESC, fecha ASC LIMIT ${n}`;
    return reply.send({ top });
  });

  // Records individuales del estudiante (historial con fecha/hora).
  fastify.get('/:juego/mis-records', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const { juego } = request.params as { juego: string };
    const user = request.user as { id: number };
    const records = await prisma.$queryRaw<any[]>`
      SELECT puntos, mundo, creado_en AS fecha FROM puntajes_juego
      WHERE juego = ${juego} AND usuario_id = ${user.id} ORDER BY creado_en DESC LIMIT 20`;
    const mejor = (await prisma.$queryRaw<any[]>`SELECT COALESCE(MAX(puntos),0)::int m FROM puntajes_juego WHERE juego=${juego} AND usuario_id=${user.id}`)[0]?.m ?? 0;
    return reply.send({ records, mejor });
  });

  // Guardar un puntaje (registro con fecha/hora). Requiere sesión.
  fastify.post('/score', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    const user = request.user as { id: number; nombre: string };
    const schema = z.object({ juego: z.string().min(2).max(60), puntos: z.number().int().min(0).max(1000000), mundo: z.number().int().min(1).max(9999).default(1) });
    const r = schema.safeParse(request.body);
    if (!r.success) return reply.code(400).send({ error: 'Datos inválidos' });
    const { juego, puntos, mundo } = r.data;
    await prisma.$executeRaw`INSERT INTO puntajes_juego (juego, usuario_id, nombre, puntos, mundo) VALUES (${juego}, ${user.id}, ${user.nombre}, ${puntos}, ${mundo})`;
    const mejor = (await prisma.$queryRaw<any[]>`SELECT COALESCE(MAX(puntos),0)::int m FROM puntajes_juego WHERE juego=${juego} AND usuario_id=${user.id}`)[0]?.m ?? puntos;
    // ¿entró al top 5?
    const top = await prisma.$queryRaw<any[]>`
      SELECT puntos FROM (SELECT DISTINCT ON (usuario_id) usuario_id, puntos FROM puntajes_juego WHERE juego=${juego} ORDER BY usuario_id, puntos DESC) t ORDER BY puntos DESC LIMIT 5`;
    const enTop = top.length < 5 || puntos >= (top[top.length - 1]?.puntos ?? 0);
    return reply.code(201).send({ ok: true, mejor, enTop });
  });
};
