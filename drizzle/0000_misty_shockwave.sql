CREATE TABLE `attendance_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`lecture_date` text NOT NULL,
	`faculty_name` text NOT NULL,
	`department` text NOT NULL,
	`class_name` text NOT NULL,
	`division` text NOT NULL,
	`subject_name` text NOT NULL,
	`session_type` text NOT NULL,
	`period_time` text NOT NULL,
	`total_students` integer NOT NULL,
	`present_students` integer NOT NULL,
	`remarks` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_attendance_date` ON `attendance_entries` (`lecture_date`);--> statement-breakpoint
CREATE INDEX `idx_attendance_department_date` ON `attendance_entries` (`department`,`lecture_date`);--> statement-breakpoint
CREATE INDEX `idx_attendance_faculty_date` ON `attendance_entries` (`faculty_name`,`lecture_date`);