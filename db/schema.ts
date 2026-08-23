import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ownerUserId: text('owner_user_id').notNull(),
  journeyStartDate: text('journey_start_date'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('idx_households_owner_user_id').on(table.ownerUserId)]);

export const members = sqliteTable('members', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  authUserId: text('auth_user_id'),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['adult', 'teen'] }).notNull(),
  color: text('color').notNull(),
  privateHealthData: integer('private_health_data', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('idx_members_household_auth').on(table.householdId, table.authUserId),
]);

export const programTracks = sqliteTable('program_tracks', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  audience: text('audience', { enum: ['adult', 'teen'] }).notNull(),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  startedOn: text('started_on'),
}, (table) => [uniqueIndex('idx_program_tracks_member_active').on(table.memberId, table.active)]);

export const dailyPlans = sqliteTable('daily_plans', {
  id: text('id').primaryKey(),
  trackId: text('track_id').notNull().references(() => programTracks.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  weekNumber: integer('week_number').notNull(),
  theme: text('theme').notNull(),
  scripture: text('scripture').notNull(),
  memoryPassage: text('memory_passage'),
  reflectionPrompt: text('reflection_prompt'),
}, (table) => [uniqueIndex('idx_daily_plans_track_day').on(table.trackId, table.dayNumber)]);

export const commitments = sqliteTable('commitments', {
  id: text('id').primaryKey(),
  dailyPlanId: text('daily_plan_id').notNull().references(() => dailyPlans.id, { onDelete: 'cascade' }),
  category: text('category', { enum: ['faith', 'body', 'stewardship', 'character', 'together'] }).notNull(),
  title: text('title').notNull(),
  greenVersion: text('green_version').notNull(),
  yellowVersion: text('yellow_version').notNull(),
  redVersion: text('red_version').notNull(),
  isPrivate: integer('is_private', { mode: 'boolean' }).notNull().default(false),
  sortOrder: integer('sort_order').notNull(),
});

export const checkins = sqliteTable('checkins', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  dailyPlanId: text('daily_plan_id').notNull().references(() => dailyPlans.id, { onDelete: 'cascade' }),
  capacity: text('capacity', { enum: ['green', 'yellow', 'red'] }).notNull(),
  status: text('status', { enum: ['active', 'complete', 'modified', 'incomplete'] }).notNull(),
  completedCommitmentIds: text('completed_commitment_ids', { mode: 'json' }).$type<string[]>().notNull(),
  privateReflection: text('private_reflection'),
  checkedInAt: integer('checked_in_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('idx_checkins_member_plan').on(table.memberId, table.dailyPlanId)]);
