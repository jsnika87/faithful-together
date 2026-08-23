CREATE TABLE `checkins` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`daily_plan_id` text NOT NULL,
	`capacity` text NOT NULL,
	`status` text NOT NULL,
	`completed_commitment_ids` text NOT NULL,
	`private_reflection` text,
	`checked_in_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`daily_plan_id`) REFERENCES `daily_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_checkins_member_plan` ON `checkins` (`member_id`,`daily_plan_id`);--> statement-breakpoint
CREATE TABLE `commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_plan_id` text NOT NULL,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`green_version` text NOT NULL,
	`yellow_version` text NOT NULL,
	`red_version` text NOT NULL,
	`is_private` integer DEFAULT false NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`daily_plan_id`) REFERENCES `daily_plans`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `daily_plans` (
	`id` text PRIMARY KEY NOT NULL,
	`track_id` text NOT NULL,
	`day_number` integer NOT NULL,
	`week_number` integer NOT NULL,
	`theme` text NOT NULL,
	`scripture` text NOT NULL,
	`memory_passage` text,
	`reflection_prompt` text,
	FOREIGN KEY (`track_id`) REFERENCES `program_tracks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_plans_track_day` ON `daily_plans` (`track_id`,`day_number`);--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`journey_start_date` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_households_owner_user_id` ON `households` (`owner_user_id`);--> statement-breakpoint
CREATE TABLE `members` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`auth_user_id` text,
	`display_name` text NOT NULL,
	`role` text NOT NULL,
	`color` text NOT NULL,
	`private_health_data` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_household_auth` ON `members` (`household_id`,`auth_user_id`);--> statement-breakpoint
CREATE TABLE `program_tracks` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`title` text NOT NULL,
	`audience` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`started_on` text,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_program_tracks_member_active` ON `program_tracks` (`member_id`,`active`);