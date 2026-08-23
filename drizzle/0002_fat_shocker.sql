ALTER TABLE `members` ADD `invite_email` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_members_invite_email` ON `members` (`invite_email`);--> statement-breakpoint
CREATE INDEX `idx_exercise_substitutions_member` ON `exercise_substitutions` (`member_id`);