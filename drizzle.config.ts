import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const dbUrl =
  process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || 'postgres'}:${process.env.POSTGRES_PASSWORD || 'postgres'}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || 5432}/${process.env.POSTGRES_DB || 'agent_interface'}`;

export default defineConfig({
  schema: './src/db/agent_schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: dbUrl,
  },
});