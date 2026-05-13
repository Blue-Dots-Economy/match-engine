import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { getDpgDbUrl } from '../config';

const pool = new Pool({
  connectionString: getDpgDbUrl(),
});

export const dpgDb = drizzle(pool);

export type DpgDb = typeof dpgDb;