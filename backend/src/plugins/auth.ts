import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: 'Token inválido o expirado' });
    }
  });

  fastify.decorate('requireDocente', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      const user = request.user as { rol: string };
      if (user.rol !== 'docente' && user.rol !== 'admin') {
        reply.code(403).send({ error: 'Prohibido', message: 'Se requiere rol docente o admin' });
      }
    } catch (err) {
      reply.code(401).send({ error: 'No autorizado', message: 'Token inválido' });
    }
  });
};

export default fp(authPlugin, { name: 'codexia-auth' });
