import { pgTable, text, timestamp, boolean, uuid, jsonb, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const dpgUsers = pgTable('user', {
  id: uuid('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  role: text('role').default('user'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
  phoneNumber: text('phone_number'),
  phoneNumberVerified: boolean('phone_number_verified').default(false),
  dateOfBirth: timestamp('date_of_birth'),
  termsAccepted: boolean('terms_accepted').default(false),
  privacyAccepted: boolean('privacy_accepted').default(false),
});

export type DpgUser = typeof dpgUsers.$inferSelect;
export type NewDpgUser = typeof dpgUsers.$inferInsert;

export const dpgItems = pgTable('items', {
  item_network: text('item_network').notNull(),
  item_domain: text('item_domain').notNull(),
  item_type: text('item_type').notNull(),
  item_id: uuid('item_id').defaultRandom().notNull(),

  item_instance_url: text('item_instance_url').notNull(),
  item_schema_url: text('item_schema_url').notNull(),

  item_state: jsonb('item_state')
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  item_latitude: doublePrecision('item_latitude'),
  item_longitude: doublePrecision('item_longitude'),
  created_by: text('created_by').notNull(),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type DpgItem = typeof dpgItems.$inferSelect;
export type NewDpgItem = typeof dpgItems.$inferInsert;