import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

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
  inviteEmail: text('invite_email'),
  displayName: text('display_name').notNull(),
  role: text('role', { enum: ['adult', 'teen'] }).notNull(),
  color: text('color').notNull(),
  privateHealthData: integer('private_health_data', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [
  uniqueIndex('idx_members_household_auth').on(table.householdId, table.authUserId),
  uniqueIndex('idx_members_invite_email').on(table.inviteEmail),
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

export const householdSettings = sqliteTable('household_settings', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  programName: text('program_name').notNull().default('Faithful Together'),
  sharedStartDate: text('shared_start_date'),
  weeklyReviewDay: text('weekly_review_day').notNull().default('Sunday'),
  familyQuietHoursStart: text('family_quiet_hours_start').notNull().default('21:00'),
  familyQuietHoursEnd: text('family_quiet_hours_end').notNull().default('06:00'),
  sharedWalkEnabled: integer('shared_walk_enabled', { mode: 'boolean' }).notNull().default(true),
  encouragementEnabled: integer('encouragement_enabled', { mode: 'boolean' }).notNull().default(true),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('idx_household_settings_household').on(table.householdId)]);

export const memberSettings = sqliteTable('member_settings', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  personalStartDate: text('personal_start_date'),
  goalWeight: integer('goal_weight'),
  stepGoal: integer('step_goal').notNull().default(7000),
  hydrationGoalOz: integer('hydration_goal_oz'),
  sleepGoalMinutes: integer('sleep_goal_minutes').notNull().default(420),
  movementMinutes: integer('movement_minutes').notNull().default(20),
  scriptureMinutes: integer('scripture_minutes').notNull().default(20),
  remindersEnabled: integer('reminders_enabled', { mode: 'boolean' }).notNull().default(true),
  showWeightToHousehold: integer('show_weight_to_household', { mode: 'boolean' }).notNull().default(false),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('idx_member_settings_member').on(table.memberId)]);

export const exerciseSubstitutions = sqliteTable('exercise_substitutions', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  originalExercise: text('original_exercise').notNull(),
  replacementExercise: text('replacement_exercise').notNull(),
  reason: text('reason'),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
}, (table) => [index('idx_exercise_substitutions_member').on(table.memberId)]);

export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull().references(() => households.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['calendar', 'smart_home', 'wearable', 'tasks'] }).notNull(),
  provider: text('provider').notNull(),
  status: text('status', { enum: ['planned', 'connected', 'attention'] }).notNull().default('planned'),
  displayLabel: text('display_label').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
}, (table) => [uniqueIndex('idx_integrations_household_kind_provider').on(table.householdId, table.kind, table.provider)]);
