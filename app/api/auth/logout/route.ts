import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { hashToken, SESSION_COOKIE } from "@/lib/auth";
export async function POST(request: NextRequest) { const token=request.cookies.get(SESSION_COOKIE)?.value; if(token) await getDb().delete(sessions).where(eq(sessions.tokenHash,await hashToken(token))); const response=NextResponse.json({ok:true}); response.cookies.set({name:SESSION_COOKIE,value:"",path:"/",maxAge:0}); return response; }
