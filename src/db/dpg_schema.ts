import { pgTable, text, timestamp, boolean, uuid } from 'drizzle-orm/pg-core';

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