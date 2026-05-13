import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { upsertUser } from './upsert';

const userRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(upsertUser);
};

export default userRoutes;