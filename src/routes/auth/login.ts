import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { agentDb } from '../../db';
import { agents, apiKeys } from '../../db/agent_schema';
import { verifyPassword, generateApiKey, generateApiSecret, hashApiKey, getApiKeyPrefix } from '../../utils/crypto';

const LoginBodySchema = z.object({
  name: z.string().min(1).describe('Name of the registered agent'),
  secret: z.string().min(1).describe('Secret password for the agent'),
});

const LoginResponseSchema = z.object({
  agent_id: z.string().uuid().describe('Unique agent ID'),
  api_key: z.string().describe('API key for authentication'),
  api_secret: z.string().describe('API secret for authentication'),
  key_prefix: z.string().describe('Prefix of the API key'),
});

type LoginRequest = FastifyRequest<{
  Body: z.infer<typeof LoginBodySchema>;
}>;

export const login: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/login',
    method: 'POST',
    schema: {
      tags: ['auth'],
      body: LoginBodySchema,
      response: {
        200: LoginResponseSchema,
      },
    },
    handler: loginHandler,
  });
};

const loginHandler = async (request: LoginRequest, reply: FastifyReply) => {
  const { name, secret } = request.body;

  try {
    // Find agent by name
    const [agent] = await agentDb
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);

    if (!agent) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid agent name or secret',
      });
    }

    // Verify secret
    const isValid = await verifyPassword(secret, agent.secretHash);
    if (!isValid) {
      return reply.code(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid agent name or secret',
      });
    }

    // Get active API key
    const [existingKey] = await agentDb
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.agentId, agent.id));

    if (existingKey) {
      // Return existing key (we can't show it again, so generate new)
      const newApiKey = generateApiKey();
      const newApiSecret = generateApiSecret();
      const keyHash = await hashApiKey(newApiKey);
      const keyPrefix = getApiKeyPrefix(newApiKey);

      // Deactivate old key
      await agentDb
        .update(apiKeys)
        .set({ isActive: false })
        .where(eq(apiKeys.id, existingKey.id));

      // Create new key
      await agentDb
        .insert(apiKeys)
        .values({
          agentId: agent.id,
          keyHash,
          keyPrefix,
          isActive: true,
        });

      return reply.code(200).send({
        agent_id: agent.id,
        api_key: newApiKey,
        api_secret: newApiSecret,
        key_prefix: keyPrefix,
      });
    }

    // No existing key, generate new one
    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    await agentDb
      .insert(apiKeys)
      .values({
        agentId: agent.id,
        keyHash,
        keyPrefix,
        isActive: true,
      });

    return reply.code(200).send({
      agent_id: agent.id,
      api_key: apiKey,
      api_secret: apiSecret,
      key_prefix: keyPrefix,
    });
  } catch (err) {
    request.log.error({ err, name }, 'Failed to login');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to login',
    });
  }
};