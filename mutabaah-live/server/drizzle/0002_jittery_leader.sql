CREATE INDEX `amalan_usrah_id_idx` ON `amalan` (`usrah_id`);--> statement-breakpoint
CREATE INDEX `daily_logs_usrah_date_idx` ON `daily_logs` (`usrah_id`,`date`);--> statement-breakpoint
CREATE INDEX `device_tokens_user_id_idx` ON `device_tokens` (`user_id`);--> statement-breakpoint
CREATE INDEX `guidance_usrah_id_idx` ON `guidance` (`usrah_id`);--> statement-breakpoint
CREATE INDEX `guidance_replies_guidance_id_idx` ON `guidance_replies` (`guidance_id`);--> statement-breakpoint
CREATE INDEX `memberships_usrah_id_idx` ON `memberships` (`usrah_id`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at_idx` ON `sessions` (`expires_at`);