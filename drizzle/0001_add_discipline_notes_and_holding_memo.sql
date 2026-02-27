-- Custom SQL migration file, put your code below! --
ALTER TABLE `holdings` ADD `memo` text;
--> statement-breakpoint
CREATE TABLE `discipline_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`quote` text NOT NULL,
	`plan` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `discipline_notes_user_updated_at_idx` ON `discipline_notes` (`user_id`,`updated_at`);
