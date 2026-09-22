import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createRecoveryCode, createSession, hashPassword, hashToken, normalizeLoginPassword, sessionCookie, verifyPassword } from "@/lib/auth";

const AUTH_RELEASE = "2026-09-22-final";

function sameHash(actual: string, expected: string | null) {
  if (!expected || actual.length !== expected.length) return false;
  let diff = 0;
  for (let i=0;i<actual.length;i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function POST(request: NextRequest) {
  const body = await request.json(); const email=String(body.email??"").trim().toLowerCase(); const password=normalizeLoginPassword(String(body.password??""));
  const [user] = await getDb().select().from(users).where(eq(users.email,email)).limit(1);
  if (!user) return NextResponse.json({error:"Invalid email or password.",release:AUTH_RELEASE},{status:401});
  let passwordValid=await verifyPassword(password,user.passwordHash);
  let recoveryCode: string | undefined;
  if(!passwordValid&&password.startsWith("AMS-")&&sameHash(await hashToken(password),user.recoveryCodeHash)){
    passwordValid=true;
    recoveryCode=createRecoveryCode();
    await getDb().update(users).set({passwordHash:await hashPassword(password),recoveryCodeHash:await hashToken(recoveryCode),resetAttempts:0,resetLockedUntil:null}).where(eq(users.id,user.id));
  }
  if (!passwordValid) return NextResponse.json({error:"Invalid email or password.",release:AUTH_RELEASE},{status:401});
  if (user.status !== "approved") return NextResponse.json({error:"Your account is awaiting Admin approval.",release:AUTH_RELEASE},{status:403});
  const session=await createSession(user.id); const response=NextResponse.json({ok:true,recoveryCode,release:AUTH_RELEASE}); response.cookies.set(sessionCookie(session.token,session.expiresAt)); return response;
}
