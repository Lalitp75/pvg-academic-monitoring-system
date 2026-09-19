import { asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/db";
import { attendanceEntries } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user=await currentUser(request);
  if(!user)return NextResponse.json({error:"Please log in."},{status:401});
  const date=request.nextUrl.searchParams.get("date") || new Date().toISOString().slice(0,10);
  const entries=await getDb().select().from(attendanceEntries).where(eq(attendanceEntries.lectureDate,date)).orderBy(desc(attendanceEntries.presentStudents),asc(attendanceEntries.id));
  entries.sort((a,b)=>(b.presentStudents/b.totalStudents)-(a.presentStudents/a.totalStudents)||b.presentStudents-a.presentStudents||b.id-a.id);
  const groups=new Map<string,{department:string;sessions:number;present:number;total:number}>();
  for(const entry of entries){const current=groups.get(entry.department)||{department:entry.department,sessions:0,present:0,total:0};current.sessions++;current.present+=entry.presentStudents;current.total+=entry.totalStudents;groups.set(entry.department,current);}
  const departments=Array.from(groups.values()).map(d=>({...d,percentage:d.total?Math.round(d.present/d.total*100):0})).sort((a,b)=>b.percentage-a.percentage||b.present-a.present);
  return NextResponse.json({date,entries,departments});
}
