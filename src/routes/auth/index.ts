import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { register } from './register';
import { login } from './login';

const authRoutes: FastifyPluginAsyncZod = async (fastify) => {
  fastify.register(register);
  fastify.register(login);
};

export default authRoutes;