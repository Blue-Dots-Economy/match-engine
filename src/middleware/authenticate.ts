import { FastifyRequest, FastifyReply } from 'fastify';
import { eq, and, or, isNull } from 'drizzle-orm';
import { agentDb } from '../db';
import { apiKeys, agents } from '../db/agent_schema';
import { verifyApiKey } from '../utils/crypto';

export interface AuthenticatedAgent {
  id: string;
  name: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    agent?: AuthenticatedAgent;
  }
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const apiKey = request.headers['x-api-key'] as string;

  if (!apiKey) {
    return reply.code(401).send({
      error: 'UNAUTHORIZED',
      message: 'API key is required. Use X-API-Key header.',
    });
  }

  // Fetch active API keys and verify
  const keys = await agentDb
    .select()
    .from(apiKeys)
    .where(
      and(
        eq(apiKeys.isActive, true),
        or(isNull(apiKeys.expiresAt), apiKeys.expiresAt as any > new Date())
      )
    );

  let matchedKey: typeof keys[0] | null = null;

  for (const key of keys) {
    const isValid = await verifyApiKey(apiKey, key.keyHash);
    if (isValid) {
      matchedKey = key;
      break;
    }
  }

  if (!matchedKey) {
    return reply.code(401).send({
      error: 'UNAUTHORIZED',
      message: 'Invalid or expired API key',
    });
  }

  // Get agent info
  const [agent] = await agentDb
    .select()
    .from(agents)
    .where(eq(agents.id, matchedKey.agentId))
    .limit(1);

  if (!agent) {
    return reply.code(401).send({
      error: 'UNAUTHORIZED',
      message: 'Agent not found',
    });
  }

  request.agent = {
    id: agent.id,
    name: agent.name,
  };
}