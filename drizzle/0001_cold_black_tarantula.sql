CREATE TABLE `exercise_substitutions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`original_exercise` text NOT NULL,
	`replacement_exercise` text NOT NULL,
	`reason` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `household_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`program_name` text DEFAULT 'Faithful Together' NOT NULL,
	`shared_start_date` text,
	`weekly_review_day` text DEFAULT 'Sunday' NOT NULL,
	`family_quiet_hours_start` text DEFAULT '21:00' NOT NULL,
	`family_quiet_hours_end` text DEFAULT '06:00' NOT NULL,
	`shared_walk_enabled` integer DEFAULT true NOT NULL,
	`encouragement_enabled` integer DEFAULT true NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_household_settings_household` ON `household_settings` (`household_id`);--> statement-breakpoint
CREATE TABLE `integrations` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`kind` text NOT NULL,
	`provider` text NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`display_label` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `households`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_integrations_household_kind_provider` ON `integrations` (`household_id`,`kind`,`provider`);--> statement-breakpoint
CREATE TABLE `member_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`personal_start_date` text,
	`goal_weight` integer,
	`step_goal` integer DEFAULT 7000 NOT NULL,
	`hydration_goal_oz` integer,
	`sleep_goal_minutes` integer DEFAULT 420 NOT NULL,
	`movement_minutes` integer DEFAULT 20 NOT NULL,
	`scripture_minutes` integer DEFAULT 20 NOT NULL,
	`reminders_enabled` integer DEFAULT true NOT NULL,
	`show_weight_to_household` integer DEFAULT false NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_member_settings_member` ON `member_settings` (`member_id`);