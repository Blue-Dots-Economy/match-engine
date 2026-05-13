import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import userRoutes from './v1/user';
// import itemRoutes from './v1/item';

const v1Routes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(userRoutes, { prefix: '/user' });
  // fastify.register(itemRoutes, { prefix: '/item' });
  // Item routes - Step 6
  // Action routes - Step 7
  // Event routes - Step 8
};

export default v1Routes;