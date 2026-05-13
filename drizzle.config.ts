import { defineConfig } from 'drizzle-kit';
import { getAgentDbUrl } from './src/config';

export default defineConfig({
  schema: './src/db/agent_schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: getAgentDbUrl(),
    driver: 'pg',
  },
});