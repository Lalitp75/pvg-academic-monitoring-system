import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { attendanceEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const filters = [];
    const department = params.get("department");
    const from = params.get("from");
    const to = params.get("to");
    if (department && department !== "All Departments") filters.push(eq(attendanceEntries.department, department));
    if (from) filters.push(gte(attendanceEntries.lectureDate, from));
    if (to) filters.push(lte(attendanceEntries.lectureDate, to));
    const rows = await getDb().select().from(attendanceEntries)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(attendanceEntries.lectureDate), desc(attendanceEntries.id));
    return NextResponse.json(rows);
  } catch (error) {
    console.error("attendance GET failed", error);
    return NextResponse.json({ error: "Attendance records are temporarily unavailable." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const required = ["lectureDate", "facultyName", "department", "className", "division", "subjectName", "sessionType", "periodTime"];
    if (required.some((key) => !String(body[key] ?? "").trim())) {
      return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
    }
    const totalStudents = Number(body.totalStudents);
    const presentStudents = Number(body.presentStudents);
    if (!Number.isInteger(totalStudents) || !Number.isInteger(presentStudents) || totalStudents < 1 || presentStudents < 0 || presentStudents > totalStudents) {
      return NextResponse.json({ error: "Please enter valid student counts." }, { status: 400 });
    }
    const [created] = await getDb().insert(attendanceEntries).values({
      lectureDate: body.lectureDate,
      facultyName: body.facultyName.trim(),
      department: body.department,
      className: body.className,
      division: body.division.trim(),
      subjectName: body.subjectName.trim(),
      sessionType: body.sessionType,
      periodTime: body.periodTime.trim(),
      totalStudents,
      presentStudents,
      remarks: String(body.remarks ?? "").trim(),
      createdAt: new Date().toISOString(),
    }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("attendance POST failed", error);
    return NextResponse.json({ error: "The entry could not be saved. Please try again." }, { status: 500 });
  }
}
