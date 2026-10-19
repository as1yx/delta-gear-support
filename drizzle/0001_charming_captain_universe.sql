CREATE TABLE `human_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`thread_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`sender_role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`thread_id`) REFERENCES `human_threads`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `human_messages_thread_idx` ON `human_messages` (`thread_id`,`id`);--> statement-breakpoint
CREATE TABLE `human_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `human_threads_user_id_unique` ON `human_threads` (`user_id`);