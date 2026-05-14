import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createAction } from './create';
import { fetchActions } from './fetch';

export const actionRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(createAction);
  fastify.register(fetchActions);
};