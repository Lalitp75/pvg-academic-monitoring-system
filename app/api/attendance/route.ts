import { and, desc, eq, gte, lte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { attendanceEntries, attendanceOwnership } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
    const params = request.nextUrl.searchParams;
    const filters = [];
    const department = params.get("department");
    const from = params.get("from");
    const to = params.get("to");
    if (department && department !== "All Departments") filters.push(eq(attendanceEntries.department, department));
    if (from) filters.push(gte(attendanceEntries.lectureDate, from));
    if (to) filters.push(lte(attendanceEntries.lectureDate, to));
    if (user.role !== "admin") filters.push(eq(attendanceOwnership.userId, user.id));
    const rows = await getDb().select({
      id: attendanceEntries.id, lectureDate: attendanceEntries.lectureDate, facultyName: attendanceEntries.facultyName,
      department: attendanceEntries.department, className: attendanceEntries.className, division: attendanceEntries.division,
      subjectName: attendanceEntries.subjectName, sessionType: attendanceEntries.sessionType, periodTime: attendanceEntries.periodTime,
      totalStudents: attendanceEntries.totalStudents, presentStudents: attendanceEntries.presentStudents, remarks: attendanceEntries.remarks,
      createdAt: attendanceEntries.createdAt,
    }).from(attendanceEntries).leftJoin(attendanceOwnership, eq(attendanceOwnership.entryId, attendanceEntries.id))
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
    const user = await currentUser(request);
    if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });
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
      facultyName: user.role === "staff" ? user.name : body.facultyName.trim(),
      department: user.role === "staff" ? user.department : body.department,
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
    await getDb().insert(attendanceOwnership).values({ entryId: created.id, userId: user.id });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("attendance POST failed", error);
    return NextResponse.json({ error: "The entry could not be saved. Please try again." }, { status: 500 });
  }
}
