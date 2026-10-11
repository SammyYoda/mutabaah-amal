import { sql } from 'drizzle-orm';
import { sqliteTable, integer, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';

const id = () => integer('id').primaryKey({ autoIncrement: true });
const ts = (name: string) => integer(name, { mode: 'timestamp_ms' });

export const users = sqliteTable(
  'users',
  {
    id: id(),
    email: text('email').notNull(), // already trimmed + lower-cased by route code
    name: text('name').notNull(),
    phone: text('phone'),
    passwordHash: text('password_hash').notNull(),
    isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
    mustChangePassword: integer('must_change_password', { mode: 'boolean' }).notNull().default(false),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: id(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [
    uniqueIndex('sessions_token_hash_unique').on(t.tokenHash),
    index('sessions_user_id_idx').on(t.userId),
    index('sessions_expires_at_idx').on(t.expiresAt), // createSession's sweep
  ],
);

/** Trusted-device tokens: a browser that logged in before skips the per-email login cap (lockout resistance). */
export const deviceTokens = sqliteTable(
  'device_tokens',
  {
    id: id(),
    userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: ts('expires_at').notNull(),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [uniqueIndex('device_tokens_token_hash_unique').on(t.tokenHash), index('device_tokens_user_id_idx').on(t.userId)],
);

export const usrah = sqliteTable(
  'usrah',
  {
    id: id(),
    name: text('name').notNull(),
    inviteCode: text('invite_code').notNull(),
    createdAt: ts('created_at').notNull(),
  },
  (t) => [uniqueIndex('usrah_invite_code_unique').on(t.inviteCode)],
);

export const naqibInvites = sqliteTable(
  'naqib_invites',
  {
    id: id(),
    usrahId: integer('usrah_id').notNull().references(() => usrah.id),
    tokenHash: text('token_hash').notNull(),
    expiresAt: ts('expires_at').notNull(),
    usedAt: ts('used_at'),
    createdBy: integer('created_by').notNull().references(() => users.id),
  },
  (t) => [uniqueIndex('naqib_invites_token_hash_unique').on(t.tokenHash)],
);

export const memberships = sqliteTable(
  'memberships',
  {
    id: id(),
    userId: integer('user_id').notNull().references(() => users.id),
    usrahId: integer('usrah_id').notNull().references(() => usrah.id),
    role: text('role', { enum: ['naqib', 'member'] }).notNull(),
    joinedAt: ts('joined_at').notNull(),
    removedAt: ts('removed_at'),
  },
  (t) => [
    // at most one active membership per user
    uniqueIndex('memberships_one_active_per_user').on(t.userId).where(sql`removed_at IS NULL`),
    index('memberships_usrah_id_idx').on(t.usrahId),
  ],
);

export const amalan = sqliteTable('amalan', {
  id: id(),
  usrahId: integer('usrah_id').notNull().references(() => usrah.id),
  code: text('code'),
  name: text('name').notNull(),
  description: text('description'),
  freq: text('freq', { enum: ['harian', 'mingguan', 'bulanan'] }).notNull(),
  inputType: text('input_type', { enum: ['count', 'check', 'prayers'] }).notNull(),
  targetVal: integer('target_val').notNull(),
  unit: text('unit'),
  icon: text('icon').notNull().default('check_circle'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdOn: text('created_on').notNull(), // YYYY-MM-DD
  deactivatedOn: text('deactivated_on'), // YYYY-MM-DD | null
}, (t) => [index('amalan_usrah_id_idx').on(t.usrahId)]);

export const dailyLogs = sqliteTable(
  'daily_logs',
  {
    id: id(),
    userId: integer('user_id').notNull().references(() => users.id),
    usrahId: integer('usrah_id').notNull().references(() => usrah.id),
    date: text('date').notNull(), // YYYY-MM-DD
    values: text('values', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    notes: text('notes'),
    updatedAt: ts('updated_at').notNull(),
  },
  (t) => [
    uniqueIndex('daily_logs_user_date_unique').on(t.userId, t.date),
    index('daily_logs_usrah_date_idx').on(t.usrahId, t.date), // matrix / summary date windows
  ],
);

export const guidance = sqliteTable('guidance', {
  id: id(),
  usrahId: integer('usrah_id').notNull().references(() => usrah.id),
  fromUserId: integer('from_user_id').notNull().references(() => users.id),
  toUserId: integer('to_user_id').references(() => users.id), // null = whole usrah
  category: text('category').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  reference: text('reference'),
  createdAt: ts('created_at').notNull(),
}, (t) => [index('guidance_usrah_id_idx').on(t.usrahId)]);

export const guidanceReads = sqliteTable(
  'guidance_reads',
  {
    guidanceId: integer('guidance_id').notNull().references(() => guidance.id),
    userId: integer('user_id').notNull().references(() => users.id),
    readAt: ts('read_at').notNull(),
  },
  (t) => [uniqueIndex('guidance_reads_pk').on(t.guidanceId, t.userId)],
);

export const guidanceReplies = sqliteTable('guidance_replies', {
  id: id(),
  guidanceId: integer('guidance_id').notNull().references(() => guidance.id),
  userId: integer('user_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: ts('created_at').notNull(),
}, (t) => [index('guidance_replies_guidance_id_idx').on(t.guidanceId)]);

export const notifications = sqliteTable('notifications', {
  id: id(),
  userId: integer('user_id').notNull().references(() => users.id),
  type: text('type').notNull(),
  text: text('text').notNull(),
  link: text('link'),
  createdAt: ts('created_at').notNull(),
  readAt: ts('read_at'),
}, (t) => [index('notifications_user_id_idx').on(t.userId)]);
