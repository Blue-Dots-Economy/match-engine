import { type FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import z from 'zod';
import { eq } from 'drizzle-orm';
import { FastifyReply, FastifyRequest } from 'fastify';
import { agentDb } from '../../db';
import { agents, apiKeys } from '../../db/agent_schema';
import { hashPassword, generateApiKey, generateApiSecret, hashApiKey, getApiKeyPrefix } from '../../utils/crypto';

const RegisterBodySchema = z.object({
  name: z.string().min(1).max(100).describe('Name of the agent'),
  secret: z.string().min(8).max(100).describe('Secret password for the agent'),
});

const RegisterResponseSchema = z.object({
  agent_id: z.string().uuid().describe('Unique agent ID'),
  api_key: z.string().describe('API key for authentication'),
  api_secret: z.string().describe('API secret for authentication'),
  key_prefix: z.string().describe('Prefix of the API key'),
});

type RegisterRequest = FastifyRequest<{
  Body: z.infer<typeof RegisterBodySchema>;
}>;

export const register: FastifyPluginAsyncZod = async (fastify) => {
  fastify.route({
    url: '/register',
    method: 'POST',
    schema: {
      tags: ['auth'],
      body: RegisterBodySchema,
      response: {
        201: RegisterResponseSchema,
      },
    },
    handler: registerHandler,
  });
};

const registerHandler = async (request: RegisterRequest, reply: FastifyReply) => {
  const { name, secret } = request.body;

  try {
    // Check if agent with same name exists
    const existing = await agentDb
      .select()
      .from(agents)
      .where(eq(agents.name, name))
      .limit(1);

    if (existing.length > 0) {
      return reply.code(409).send({
        error: 'AGENT_EXISTS',
        message: 'An agent with this name already exists',
      });
    }

    // Hash the secret
    const secretHash = await hashPassword(secret);

    // Create agent
    const [agent] = await agentDb
      .insert(agents)
      .values({
        name,
        secretHash,
      })
      .returning();

    // Generate API key and secret
    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();
    const keyHash = await hashApiKey(apiKey);
    const keyPrefix = getApiKeyPrefix(apiKey);

    // Create API key
    await agentDb
      .insert(apiKeys)
      .values({
        agentId: agent.id,
        keyHash,
        keyPrefix,
        isActive: true,
      });

    return reply.code(201).send({
      agent_id: agent.id,
      api_key: apiKey,
      api_secret: apiSecret,
      key_prefix: keyPrefix,
    });
  } catch (err) {
    request.log.error({ err, name }, 'Failed to register agent');
    return reply.code(500).send({
      error: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to register agent',
    });
  }
};