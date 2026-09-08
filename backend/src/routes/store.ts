import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const purchaseSchema = z.object({
  item_id: z.number(),
});

const updateAvatarSchema = z.object({
  avatar_config: z.object({
    color: z.string().optional(),
    sombrero: z.string().nullable().optional(),
    accesorio: z.string().nullable().optional(),
    forma: z.enum(['nino', 'nina']).optional(),
    mascota: z.string().nullable().optional(),
  }),
});

export const storeRoutes: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.get('/items', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const items = await prisma.storeItem.findMany({
      where: { activo: true },
      orderBy: [{ tipo: 'asc' }, { costoMonedas: 'asc' }],
    });

    return reply.send({ items });
  });

  fastify.post('/purchase', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number };
    const result = purchaseSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({ error: 'Datos inválidos' });
    }

    const { item_id } = result.data;

    const item = await prisma.storeItem.findUnique({ where: { id: item_id } });
    if (!item || !item.activo) {
      return reply.code(404).send({ error: 'Item no encontrado' });
    }

    // Items exclusivos: no se compran, se ganan completando mundos especiales/importantes
    const datos = (item.datos ?? {}) as any;
    if (datos.exclusivo) {
      return reply.code(403).send({
        error: datos.comoObtener ?? 'Este objeto solo se gana completando un Mundo Especial',
      });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { monedas: true, gemas: true },
    });

    if (!dbUser) {
      return reply.code(404).send({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya lo tiene
    const existing = await prisma.userInventory.findUnique({
      where: { usuarioId_itemId: { usuarioId: user.id, itemId: item_id } },
    });

    if (existing) {
      return reply.code(409).send({ error: 'Ya tienes este item' });
    }

    // Verificar fondos
    if (item.costoMonedas > 0 && dbUser.monedas < item.costoMonedas) {
      return reply.code(400).send({ error: 'Monedas insuficientes', monedas: dbUser.monedas, costo: item.costoMonedas });
    }

    if (item.costoGemas > 0 && dbUser.gemas < item.costoGemas) {
      return reply.code(400).send({ error: 'Gemas insuficientes', gemas: dbUser.gemas, costo: item.costoGemas });
    }

    // Transacción: descontar y agregar al inventario
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          monedas: { decrement: item.costoMonedas },
          gemas: { decrement: item.costoGemas },
        },
      }),
      prisma.userInventory.create({
        data: { usuarioId: user.id, itemId: item_id },
      }),
    ]);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { monedas: true, gemas: true },
    });

    return reply.code(201).send({
      ok: true,
      item,
      balance: updatedUser,
    });
  });

  fastify.get('/inventory/:userId', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const { userId } = request.params as { userId: string };
    const jwtUser = request.user as { id: number; rol: string };

    const targetId = parseInt(userId, 10);
    if (jwtUser.id !== targetId && jwtUser.rol === 'estudiante') {
      return reply.code(403).send({ error: 'Sin permiso' });
    }

    const inventory = await prisma.userInventory.findMany({
      where: { usuarioId: targetId },
      include: { item: true },
      orderBy: { compradoEn: 'desc' },
    });

    return reply.send({ inventory: inventory.map((i) => i.item) });
  });

  fastify.put('/avatar', {
    preHandler: [fastify.authenticate],
  }, async (request, reply) => {
    const user = request.user as { id: number };
    const result = updateAvatarSchema.safeParse(request.body);

    if (!result.success) {
      return reply.code(400).send({ error: 'Config de avatar inválida' });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { avatarConfig: result.data.avatar_config as any },
      select: { avatarConfig: true },
    });

    return reply.send({ avatarConfig: updated.avatarConfig });
  });
};
