import { asc, desc, gte } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { attendanceEntries, leaderboardHiddenEntries } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user=await currentUser(request);
  if(!user)return NextResponse.json({error:"Please log in."},{status:401});
  const toDate=request.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0,10);
  const start=new Date(`${toDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate()-1);
  const fromDate=start.toISOString().slice(0,10);
  const entries=await getDb().select().from(attendanceEntries)
    .where(gte(attendanceEntries.lectureDate,fromDate))
    .orderBy(desc(attendanceEntries.lectureDate),desc(attendanceEntries.presentStudents),asc(attendanceEntries.id));
  const hidden=await getDb().select({entryId:leaderboardHiddenEntries.entryId}).from(leaderboardHiddenEntries);
  const hiddenIds=new Set(hidden.map(item=>item.entryId));
  const visibleEntries=entries.filter(entry=>entry.lectureDate<=toDate&&!hiddenIds.has(entry.id));
  visibleEntries.sort((a,b)=>(b.presentStudents/b.totalStudents)-(a.presentStudents/a.totalStudents)||b.presentStudents-a.presentStudents||b.lectureDate.localeCompare(a.lectureDate)||b.id-a.id);
  return NextResponse.json({fromDate,toDate,entries:visibleEntries});
}

export async function DELETE(request: NextRequest) {
  const user=await currentUser(request);
  if(!user)return NextResponse.json({error:"Please log in."},{status:401});
  if(user.role!=="admin")return NextResponse.json({error:"Only the admin can hide leaderboard entries."},{status:403});
  const entryId=Number(request.nextUrl.searchParams.get("id"));
  if(!Number.isInteger(entryId)||entryId<1)return NextResponse.json({error:"Invalid leaderboard entry."},{status:400});
  await getDb().insert(leaderboardHiddenEntries).values({entryId,hiddenAt:new Date().toISOString()}).onConflictDoNothing();
  return NextResponse.json({ok:true});
}
