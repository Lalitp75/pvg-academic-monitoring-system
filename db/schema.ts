import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  department: text("department").notNull(),
    passwordHash: text("password_hash").notNull(),
    recoveryCodeHash: text("recovery_code_hash"),
    resetAttempts: integer("reset_attempts").notNull().default(0),
    resetLockedUntil: text("reset_locked_until"),
  role: text("role").notNull().default("staff"),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull(),
});

export const sessions = sqliteTable("sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const attendanceEntries = sqliteTable(
  "attendance_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    lectureDate: text("lecture_date").notNull(),
    facultyName: text("faculty_name").notNull(),
    department: text("department").notNull(),
    className: text("class_name").notNull(),
    division: text("division").notNull(),
    subjectName: text("subject_name").notNull(),
    sessionType: text("session_type").notNull(),
    periodTime: text("period_time").notNull(),
    totalStudents: integer("total_students").notNull(),
    presentStudents: integer("present_students").notNull(),
    remarks: text("remarks").notNull().default(""),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("idx_attendance_date").on(table.lectureDate),
    index("idx_attendance_department_date").on(table.department, table.lectureDate),
    index("idx_attendance_faculty_date").on(table.facultyName, table.lectureDate),
  ],
);

export const attendanceOwnership = sqliteTable("attendance_ownership", {
  entryId: integer("entry_id").primaryKey().references(() => attendanceEntries.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});
