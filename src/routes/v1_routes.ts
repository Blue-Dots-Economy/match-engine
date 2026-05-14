import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import userRoutes from './v1/user';
import { itemRoutes } from './v1/item';
import { actionRoutes } from './v1/action';
import { eventRoutes } from './v1/event';
import { networkRoutes } from './v1/network';

const v1Routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(userRoutes, { prefix: '/user' });
  fastify.register(itemRoutes, { prefix: '/item' });
  fastify.register(actionRoutes, { prefix: '/action' });
  fastify.register(eventRoutes, { prefix: '/event' });
  fastify.register(networkRoutes, { prefix: '/network' });
};

export default v1Routes;