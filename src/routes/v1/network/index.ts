import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { networkItemRoutes } from './item';

export const networkRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(networkItemRoutes, { prefix: '/item' });
};