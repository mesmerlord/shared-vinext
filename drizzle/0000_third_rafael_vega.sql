CREATE TABLE `accounts` (
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	PRIMARY KEY(`provider`, `provider_account_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `app_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_config_key_idx` ON `app_config` (`key`);--> statement-breakpoint
CREATE TABLE `crawl_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'queued' NOT NULL,
	`attempt` integer DEFAULT 0 NOT NULL,
	`last_error` text,
	`queued_at` integer DEFAULT (unixepoch()) NOT NULL,
	`started_at` integer,
	`finished_at` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `crawl_jobs_product_kind_status_idx` ON `crawl_jobs` (`product_id`,`kind`,`status`);--> statement-breakpoint
CREATE INDEX `crawl_jobs_status_queued_idx` ON `crawl_jobs` (`status`,`queued_at`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`tagline` text NOT NULL,
	`homepage_url` text NOT NULL,
	`github_repo` text,
	`owner_id` text,
	`stack_tags` text DEFAULT '[]',
	`featured` integer DEFAULT false NOT NULL,
	`og_image_key` text,
	`favicon_key` text,
	`submitted_at` integer DEFAULT (unixepoch()) NOT NULL,
	`claimed_at` integer,
	`last_crawled_at` integer,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_slug_idx` ON `products` (`slug`);--> statement-breakpoint
CREATE INDEX `products_owner_idx` ON `products` (`owner_id`);--> statement-breakpoint
CREATE INDEX `products_featured_submitted_idx` ON `products` (`featured`,`submitted_at`);--> statement-breakpoint
CREATE TABLE `releases` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`source` text DEFAULT 'github_release' NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`tag_name` text NOT NULL,
	`external_id` text NOT NULL,
	`published_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `releases_product_external_idx` ON `releases` (`product_id`,`external_id`);--> statement-breakpoint
CREATE INDEX `releases_product_published_idx` ON `releases` (`product_id`,`published_at`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`session_token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`expires` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `updates` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`author_id` text NOT NULL,
	`summary` text NOT NULL,
	`metrics` text DEFAULT '{}',
	`week_of` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `updates_product_week_idx` ON `updates` (`product_id`,`week_of`);--> statement-breakpoint
CREATE INDEX `updates_week_idx` ON `updates` (`week_of`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text,
	`email_verified` integer,
	`image` text,
	`role` text DEFAULT 'user' NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`ban_reason` text,
	`banned_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE TABLE `verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
