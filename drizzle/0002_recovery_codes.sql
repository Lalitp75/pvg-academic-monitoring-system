ALTER TABLE `users` ADD COLUMN `recovery_code_hash` text;
ALTER TABLE `users` ADD COLUMN `reset_attempts` integer DEFAULT 0 NOT NULL;
ALTER TABLE `users` ADD COLUMN `reset_locked_until` text;
