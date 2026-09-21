import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { createRecoveryCode, hashPassword, hashToken, normalizeRecoveryCode } from "@/lib/auth";

export async function POST(request:NextRequest){
 const body=await request.json();const email=String(body.email??"").trim().toLowerCase();const code=normalizeRecoveryCode(String(body.recoveryCode??""));const password=String(body.password??"");
 if(password.length<8)return NextResponse.json({error:"New password must contain at least 8 characters."},{status:400});
 const [user]=await getDb().select().from(users).where(eq(users.email,email)).limit(1);
 if(!user)return NextResponse.json({error:"Invalid email or Recovery Code."},{status:400});
 if(user.resetLockedUntil&&new Date(user.resetLockedUntil)>new Date())return NextResponse.json({error:"Too many attempts. Please try again after 15 minutes or contact the Admin."},{status:429});
 const valid=user.recoveryCodeHash&&user.recoveryCodeHash===await hashToken(code);
 if(!valid){const attempts=(user.resetAttempts||0)+1;await getDb().update(users).set({resetAttempts:attempts>=5?0:attempts,resetLockedUntil:attempts>=5?new Date(Date.now()+15*60*1000).toISOString():null}).where(eq(users.id,user.id));return NextResponse.json({error:"Invalid email or Recovery Code."},{status:400});}
 const newRecoveryCode=createRecoveryCode();
 await getDb().update(users).set({passwordHash:await hashPassword(password),recoveryCodeHash:await hashToken(newRecoveryCode),resetAttempts:0,resetLockedUntil:null}).where(eq(users.id,user.id));
 return NextResponse.json({message:"Password reset successfully. Save your new Recovery Code.",recoveryCode:newRecoveryCode});
}
