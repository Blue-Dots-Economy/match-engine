import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { fetchNetworkItems } from './fetch';

export const networkItemRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(fetchNetworkItems);
};