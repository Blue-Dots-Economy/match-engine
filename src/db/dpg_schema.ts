import { pgTable, text, timestamp, boolean, uuid, jsonb, doublePrecision, integer } from 'drizzle-orm/pg-core';
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

export const dpgItemActions = pgTable('item_actions', {
  action_type: text('action_type').notNull(),
  partition_network: text('partition_network').notNull(),
  action_id: uuid('action_id').defaultRandom().notNull(),
  action_status: text('action_status').notNull(),
  update_count: integer('update_count').notNull().default(0),

  source_item_network: text('source_item_network').notNull(),
  source_item_domain: text('source_item_domain').notNull(),
  source_item_type: text('source_item_type').notNull(),
  source_item_id: uuid('source_item_id').notNull(),
  source_item_instance_url: text('source_item_instance_url').notNull(),
  source_item_owner: text('source_item_owner'),

  target_item_network: text('target_item_network').notNull(),
  target_item_domain: text('target_item_domain').notNull(),
  target_item_type: text('target_item_type').notNull(),
  target_item_id: uuid('target_item_id').notNull(),
  target_item_instance_url: text('target_item_instance_url').notNull(),
  target_item_owner: text('target_item_owner'),

  requirements_snapshot: jsonb('requirements_snapshot')
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  remarks: text('remarks'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export type DpgItemAction = typeof dpgItemActions.$inferSelect;
export type NewDpgItemAction = typeof dpgItemActions.$inferInsert;

export const dpgActionEvents = pgTable('action_events', {
  action_type: text('action_type').notNull(),
  partition_network: text('partition_network').notNull(),
  event_id: uuid('event_id').defaultRandom().notNull(),
  origin_instance_domain: text('origin_instance_domain').notNull(),
  action_id: uuid('action_id').notNull(),
  action_status: text('action_status').notNull(),
  update_count: integer('update_count').notNull(),

  source_item_network: text('source_item_network').notNull(),
  source_item_domain: text('source_item_domain').notNull(),
  source_item_type: text('source_item_type').notNull(),
  source_item_id: uuid('source_item_id').notNull(),
  source_item_instance_url: text('source_item_instance_url').notNull(),
  source_item_owner: text('source_item_owner'),
  source_item_latitude: doublePrecision('source_item_latitude'),
  source_item_longitude: doublePrecision('source_item_longitude'),

  target_item_network: text('target_item_network').notNull(),
  target_item_domain: text('target_item_domain').notNull(),
  target_item_type: text('target_item_type').notNull(),
  target_item_id: uuid('target_item_id').notNull(),
  target_item_instance_url: text('target_item_instance_url').notNull(),
  target_item_owner: text('target_item_owner'),
  target_item_latitude: doublePrecision('target_item_latitude'),
  target_item_longitude: doublePrecision('target_item_longitude'),

  event_payload: jsonb('event_payload')
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  remarks: text('remarks'),

  created_at: timestamp('created_at').defaultNow().notNull(),
});

export type DpgActionEvent = typeof dpgActionEvents.$inferSelect;
export type NewDpgActionEvent = typeof dpgActionEvents.$inferInsert;
