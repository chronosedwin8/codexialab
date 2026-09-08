import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const createSubmissionSchema = z.object({
  sesion_id: z.number(),
  nivel_id: z.number(),
  codigo: z.string().min(1),
  origen: z.enum(['bloques', 'bloques_texto', 'texto']),
  resultado: z.object({
    ok: z.boolean(),
    acciones: z.array(z.any()).optional(),
    error: z.object({
      mensaje: z.string(),
      linea: z.number().optional(),
    }).optional(),
    accionesParciales: z.array(z.any()).optional(),
  }),
  tiempo_ejecucion_ms: z.number().optional(),
});

export const submissionRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.post('/', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number };
    const result = createSubmissionSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos', details: result.error.flatten() });
    }

    const data = result.data;

    // Verificar que la sesión pertenece al usuario
    const session = await prisma.levelSession.findFirst({
      where: { id: data.sesion_id, usuarioId: user.id },
    });

    if (!session) {
      return reply.code(403).send({ error: 'Sesión no autorizada' });
    }

    const submission = await prisma.codeSubmission.create({
      data: {
        sesionId: data.sesion_id,
        usuarioId: user.id,
        nivelId: data.nivel_id,
        codigo: data.codigo,
        origen: data.origen as any,
        resultado: data.resultado as any,
        exitoso: data.resultado.ok,
        tiempoEjecucionMs: data.tiempo_ejecucion_ms,
      },
    });

    // Incrementar intentos en la sesión
    await prisma.levelSession.update({
      where: { id: data.sesion_id },
      data: { intentos: { increment: 1 } },
    });

    // Telemetría
    await prisma.$executeRaw`
      INSERT INTO telemetria (usuario_id, nivel_id, evento, datos)
      VALUES (${user.id}, ${data.nivel_id}, 'envio_codigo', ${JSON.stringify({
        origen: data.origen,
        exitoso: data.resultado.ok,
        lineas: data.codigo.split('\n').length,
      })}::jsonb)
    `;

    return reply.code(201).send({ submission });
  });

  fastify.get('/level/:levelId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { levelId } = request.params as { levelId: string };
    const user = request.user as { id: number };

    const submissions = await prisma.codeSubmission.findMany({
      where: {
        usuarioId: user.id,
        nivelId: parseInt(levelId, 10),
      },
      orderBy: { enviadoEn: 'desc' },
      take: 20,
      select: {
        id: true,
        codigo: true,
        origen: true,
        exitoso: true,
        resultado: true,
        tiempoEjecucionMs: true,
        enviadoEn: true,
      },
    });

    return reply.send({ submissions });
  });
};
