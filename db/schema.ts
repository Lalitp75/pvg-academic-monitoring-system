import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
