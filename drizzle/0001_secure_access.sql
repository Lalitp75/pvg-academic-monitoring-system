CREATE TABLE `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `email` text NOT NULL UNIQUE,
  `department` text NOT NULL,
  `password_hash` text NOT NULL,
  `role` text DEFAULT 'staff' NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `created_at` text NOT NULL
);
CREATE TABLE `sessions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `token_hash` text NOT NULL UNIQUE,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE TABLE `attendance_ownership` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `user_id` integer NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `attendance_entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE INDEX `idx_sessions_token` ON `sessions` (`token_hash`);
CREATE INDEX `idx_ownership_user` ON `attendance_ownership` (`user_id`);
