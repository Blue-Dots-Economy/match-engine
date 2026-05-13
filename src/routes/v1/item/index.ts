import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { createItem } from './create';
import { fetchItems } from './fetch';
import { updateItem } from './update';

export const itemRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(createItem);
  fastify.register(fetchItems);
  fastify.register(updateItem);
};