import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import authRoutes from './auth';
import v1Routes from './v1_routes';

const routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(authRoutes, { prefix: '/auth' });
  fastify.register(v1Routes, { prefix: '/api/v1' });
};

export default routes;