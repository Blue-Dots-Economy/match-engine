import z from 'zod';
import 'dotenv/config';

const ConfigSchema = z.object({
  agentDb: z.object({
    host: z.string(),
    port: z.coerce.number(),
    name: z.string(),
    user: z.string(),
    password: z.string(),
  }),
  dpgDb: z.object({
    url: z.string().url(),
  }),
  app: z.object({
    host: z.string(),
    port: z.coerce.number(),
    nodeEnv: z.enum(['development', 'production']).default('development'),
    url: z.string().default('http://localhost:3001'),
  }),
  auth: z.object({
    apiKeyPrefix: z.string().default('dpg_vai'),
    apiSecretPrefix: z.string().default('dpg_vas'),
    keyExpiryDays: z.coerce.number().optional(),
  }),
});

export const config = ConfigSchema.parse({
  agentDb: {
    host: process.env.AGENT_DB_HOST!,
    port: process.env.AGENT_DB_PORT!,
    name: process.env.AGENT_DB_NAME!,
    user: process.env.AGENT_DB_USER!,
    password: process.env.AGENT_DB_PASSWORD!,
  },
  dpgDb: {
    url: process.env.DPG_DATABASE_URL!,
  },
  app: {
    host: process.env.APP_HOST!,
    port: process.env.APP_PORT!,
    nodeEnv: process.env.NODE_ENV || 'development',
    url: process.env.APP_URL || `http://localhost:${process.env.APP_PORT || 3001}`,
  },
  auth: {
    apiKeyPrefix: process.env.API_KEY_PREFIX || 'dpg_vai',
    apiSecretPrefix: process.env.API_SECRET_PREFIX || 'dpg_vas',
    keyExpiryDays: process.env.API_KEY_EXPIRY_DAYS ? Number(process.env.API_KEY_EXPIRY_DAYS) : undefined,
  },
});

export const getAgentDbUrl = () => {
  const { host, port, name, user, password } = config.agentDb;
  return `postgresql://${user}:${password}@${host}:${port}/${name}`;
};

export const getDpgDbUrl = () => config.dpgDb.url;