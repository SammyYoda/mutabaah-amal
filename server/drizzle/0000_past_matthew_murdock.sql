CREATE TABLE `amalan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usrah_id` integer NOT NULL,
	`code` text,
	`name` text NOT NULL,
	`description` text,
	`freq` text NOT NULL,
	`input_type` text NOT NULL,
	`target_val` integer NOT NULL,
	`unit` text,
	`icon` text DEFAULT 'check_circle' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`sort` integer DEFAULT 0 NOT NULL,
	`created_on` text NOT NULL,
	`deactivated_on` text,
	FOREIGN KEY (`usrah_id`) REFERENCES `usrah`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `daily_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`usrah_id` integer NOT NULL,
	`date` text NOT NULL,
	`values` text NOT NULL,
	`notes` text,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usrah_id`) REFERENCES `usrah`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_user_date_unique` ON `daily_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `guidance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usrah_id` integer NOT NULL,
	`from_user_id` integer NOT NULL,
	`to_user_id` integer,
	`category` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`reference` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`usrah_id`) REFERENCES `usrah`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`from_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`to_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `guidance_reads` (
	`guidance_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`read_at` integer NOT NULL,
	FOREIGN KEY (`guidance_id`) REFERENCES `guidance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guidance_reads_pk` ON `guidance_reads` (`guidance_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `guidance_replies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`guidance_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`guidance_id`) REFERENCES `guidance`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`usrah_id` integer NOT NULL,
	`role` text NOT NULL,
	`joined_at` integer NOT NULL,
	`removed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`usrah_id`) REFERENCES `usrah`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memberships_one_active_per_user` ON `memberships` (`user_id`) WHERE removed_at IS NULL;--> statement-breakpoint
CREATE TABLE `naqib_invites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`usrah_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_by` integer NOT NULL,
	FOREIGN KEY (`usrah_id`) REFERENCES `usrah`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `naqib_invites_token_hash_unique` ON `naqib_invites` (`token_hash`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`text` text NOT NULL,
	`link` text,
	`created_at` integer NOT NULL,
	`read_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`password_hash` text NOT NULL,
	`is_admin` integer DEFAULT false NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `usrah` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`invite_code` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `usrah_invite_code_unique` ON `usrah` (`invite_code`);