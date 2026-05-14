import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createAction } from './create';
import { fetchActions } from './fetch';
import { updateActionStatus } from './update_status';

export const actionRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(createAction);
  fastify.register(fetchActions);
  fastify.register(updateActionStatus);
};