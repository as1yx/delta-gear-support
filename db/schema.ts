// Intentionally empty by default.
// Add Drizzle tables here when the site actually needs a database.
// See examples/d1/db/schema.ts for an opt-in example.
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const catalogs = sqliteTable('catalogs', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(1),
  updatedAt: text('updated_at').notNull(),
});
export const siteMembers = sqliteTable('site_members', {
  userId: text('user_id').primaryKey(),
  email: text('email').notNull(),
  role: text('role').notNull().default('customer'),
});
export const supportSettings = sqliteTable('support_settings', {
  id: text('id').primaryKey(),
  data: text('data').notNull(),
  revision: integer('revision').notNull().default(1),
});
export const humanThreads = sqliteTable('human_threads', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().unique(),
  status: text('status').notNull().default('waiting'),
  updatedAt: text('updated_at').notNull(),
});
export const humanMessages = sqliteTable('human_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  threadId: text('thread_id').notNull().references(() => humanThreads.id),
  senderId: text('sender_id').notNull(),
  senderRole: text('sender_role').notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull(),
}, table => [index('human_messages_thread_idx').on(table.threadId, table.id)]);
