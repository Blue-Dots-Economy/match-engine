import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { config } from '../config';
import * as schema from './agent_schema';

const pool = new Pool({
  host: config.agentDb.host,
  port: config.agentDb.port,
  database: config.agentDb.name,
  user: config.agentDb.user,
  password: config.agentDb.password,
});

export const agentDb = drizzle(pool, { schema });

export type AgentDb = typeof agentDb;