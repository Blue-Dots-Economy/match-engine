import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';
import { jsonSchemaTransform } from 'fastify-type-provider-zod';

async function registerDocsPlugin(app: import('fastify').FastifyInstance) {
  await app.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'DPG Agent Interface API',
        description:
          'API gateway for external agents to interact with DPG. Provides authentication, user management, and DPG operations.',
        version: '1.0.0',
      },
      servers: [
        {
          url: '/',
          description: 'Current server',
        },
      ],
      tags: [
        {
          name: 'auth',
          description: 'Agent authentication endpoints (no auth required)',
        },
        {
          name: 'user',
          description: 'User management endpoints (API key required)',
        },
        {
          name: 'item',
          description: 'Item management endpoints (API key required)',
        },
        {
          name: 'action',
          description: 'Action management endpoints (API key required)',
        },
        {
          name: 'event',
          description: 'Event management endpoints (API key required)',
        },
      ],
      components: {
        securitySchemes: {
          ApiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'Agent API key obtained from /auth/login',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
  });
}

export const docsPlugin = fp(registerDocsPlugin, {
  name: 'docs-plugin',
});