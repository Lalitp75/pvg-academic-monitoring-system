import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ADMIN_EMAIL, createSession, hashPassword, sessionCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
 try {
  const body = await request.json();
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const department = String(body.department ?? "").trim();
  const password = String(body.password ?? "");
  if (!name || !email || !department || password.length < 8) return NextResponse.json({ error: "Complete all fields. Password must contain at least 8 characters." }, { status: 400 });
  const existing = await getDb().select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length) return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  const isAdmin = email === ADMIN_EMAIL;
  const [created] = await getDb().insert(users).values({ name, email, department, passwordHash: await hashPassword(password), role: isAdmin ? "admin" : "staff", status: isAdmin ? "approved" : "pending", createdAt: new Date().toISOString() }).returning({ id: users.id });
  if (!isAdmin) return NextResponse.json({ status: "pending", message: "Registration submitted. Login will be available after Admin approval." }, { status: 201 });
  const session = await createSession(created.id);
  const response = NextResponse.json({ status: "approved" }, { status: 201 }); response.cookies.set(sessionCookie(session.token, session.expiresAt)); return response;
 } catch (error) {
  console.error("signup failed", error);
  return NextResponse.json({ error: error instanceof Error ? `Registration failed: ${error.message}` : "Registration failed. Please try again." }, { status: 500 });
 }
}
