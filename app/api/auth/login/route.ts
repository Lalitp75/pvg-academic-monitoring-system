import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createSession, sessionCookie, verifyPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json(); const email=String(body.email??"").trim().toLowerCase(); const password=String(body.password??"");
  const [user] = await getDb().select().from(users).where(eq(users.email,email)).limit(1);
  if (!user || !(await verifyPassword(password,user.passwordHash))) return NextResponse.json({error:"Invalid email or password."},{status:401});
  if (user.status !== "approved") return NextResponse.json({error:"Your account is awaiting Admin approval."},{status:403});
  const session=await createSession(user.id); const response=NextResponse.json({ok:true}); response.cookies.set(sessionCookie(session.token,session.expiresAt)); return response;
}
