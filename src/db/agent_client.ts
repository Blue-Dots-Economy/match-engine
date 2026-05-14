import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from './agent_schema';

const pool = new Pool({
  host: config.postgres.host,
  port: config.postgres.port,
  database: config.postgres.db,
  user: config.postgres.user,
  password: config.postgres.password,
});

export const agentDb = drizzle(pool, { schema });

export type AgentDb = typeof agentDb;