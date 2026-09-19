import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { createRecoveryCode, hashToken } from "@/lib/auth";
export async function GET(request: NextRequest) { const me=await currentUser(request); if(me?.role!=="admin") return NextResponse.json({error:"Forbidden"},{status:403}); return NextResponse.json(await getDb().select({id:users.id,name:users.name,email:users.email,department:users.department,status:users.status}).from(users).where(eq(users.role,"staff"))); }
export async function PATCH(request: NextRequest) { const me=await currentUser(request); if(me?.role!=="admin") return NextResponse.json({error:"Forbidden"},{status:403}); const body=await request.json(); if(body.action==="generateRecoveryCode"){const recoveryCode=createRecoveryCode();await getDb().update(users).set({recoveryCodeHash:await hashToken(recoveryCode),resetAttempts:0,resetLockedUntil:null}).where(eq(users.id,Number(body.id)));return NextResponse.json({ok:true,recoveryCode});}const status=body.status==="approved"?"approved":"inactive"; await getDb().update(users).set({status}).where(eq(users.id,Number(body.id))); return NextResponse.json({ok:true}); }
