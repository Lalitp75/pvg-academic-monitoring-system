CREATE TABLE `leaderboard_hidden_entries` (
  `entry_id` integer PRIMARY KEY NOT NULL,
  `hidden_at` text NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `attendance_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
