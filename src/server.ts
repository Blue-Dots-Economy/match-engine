import fastify from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import { createJsonSchemaTransform, serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod';
import cors from '@fastify/cors';
import 'dotenv/config';
import { config } from './config';
import routes from './routes';
import { docsPlugin } from './plugins/docs';
import { errorHandlerPlugin } from './plugins/errorHandler';

const app = fastify({
  logger: true,
  trustProxy: true,
});

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

await app.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
});

await app.register(errorHandlerPlugin);

await app.register(docsPlugin);

app.register(routes);

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/',
  handler: () => ({
    service: 'dpg-agent-interface',
    status: 'ok',
    version: '1.0.0',
  }),
});

app.withTypeProvider<ZodTypeProvider>().route({
  method: 'GET',
  url: '/ready',
  handler: () => ({ status: 'ready' }),
});

await app
  .listen({
    host: config.app.host,
    port: config.app.port,
  })
  .then((endpoint) => console.log('Server Endpoint:', endpoint));

let shuttingDown = false;

async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info(`Shutting down (${signal})`);
  try {
    await app.close();
  } catch (err) {
    app.log.error(err);
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);