import z from 'zod';
import 'dotenv/config';

const ConfigSchema = z.object({
  postgres: z.object({
    host: z.string(),
    port: z.coerce.number(),
    db: z.string(),
    user: z.string(),
    password: z.string(),
  }),
  dpgDb: z.object({
    url: z.string().url(),
  }),
  dpg: z.object({
    instanceUrl: z.string().url(),
    schemaBaseUrl: z.string().url(),
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
  postgres: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT!, 10),
    db: process.env.POSTGRES_DB!,
    user: process.env.POSTGRES_USER!,
    password: process.env.POSTGRES_PASSWORD!,
  },
  dpgDb: {
    url: process.env.DPG_DATABASE_URL!,
  },
  dpg: {
    instanceUrl: process.env.DPG_INSTANCE_URL || 'http://localhost:2742',
    schemaBaseUrl: process.env.SCHEMA_BASE_URL || 'https://raw.githubusercontent.com/dhiway/dpg-monorepo/refs/heads/main/examples/schemas',
  },
  app: {
    host: process.env.APP_HOST!,
    port: parseInt(process.env.APP_PORT!, 10),
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
  const { host, port, db, user, password } = config.postgres;
  return `postgresql://${user}:${password}@${host}:${port}/${db}`;
};

export const getDpgDbUrl = () => config.dpgDb.url;

export function getItemInstanceUrl(): string {
  return config.dpg.instanceUrl;
}

export function buildItemSchemaUrl(
  itemNetwork: string,
  itemDomain: string,
  itemType: string
): string {
  return `${config.dpg.schemaBaseUrl}/${itemNetwork}/network.json#/item_schemas/${itemNetwork}/${itemDomain}/${itemType}`;
}