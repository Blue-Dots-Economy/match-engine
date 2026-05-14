import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { storeEvent } from './store';
import { fetchEvents } from './fetch';

export const eventRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(storeEvent);
  fastify.register(fetchEvents);
};