import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  secretHash: text('secret_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  agentId: uuid('agent_id')
    .notNull()
    .references(() => agents.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(),
  keyPrefix: text('key_prefix').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;