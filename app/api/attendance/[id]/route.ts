import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { ensureAttendanceBatchColumn, getDb } from "@/db";
import { attendanceEntries, attendanceOwnership } from "@/db/schema";
import { currentUser } from "@/lib/auth";

async function authorizedEntry(request:NextRequest,id:number){
  const user=await currentUser(request); if(!user)return {error:NextResponse.json({error:"Please log in."},{status:401})};
  const [entry]=await getDb().select({id:attendanceEntries.id,ownerId:attendanceOwnership.userId}).from(attendanceEntries).leftJoin(attendanceOwnership,eq(attendanceOwnership.entryId,attendanceEntries.id)).where(eq(attendanceEntries.id,id)).limit(1);
  if(!entry)return {error:NextResponse.json({error:"Entry not found."},{status:404})};
  if(user.role!=="admin"&&entry.ownerId!==user.id)return {error:NextResponse.json({error:"You can modify only your own entries."},{status:403})};
  return {user};
}

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  await ensureAttendanceBatchColumn();
  const id=Number((await params).id);const access=await authorizedEntry(request,id);if(access.error)return access.error;
  const body=await request.json();const required=["lectureDate","facultyName","department","className","division","subjectName","sessionType","periodTime"];
  if(required.some(k=>!String(body[k]??"").trim()))return NextResponse.json({error:"Please complete all required fields."},{status:400});
  const batch=String(body.batch??"").trim();
  if(body.sessionType==="Practical"&&!batch)return NextResponse.json({error:"Batch is required for Practical sessions."},{status:400});
  const totalStudents=Number(body.totalStudents),presentStudents=Number(body.presentStudents);
  if(!Number.isInteger(totalStudents)||!Number.isInteger(presentStudents)||totalStudents<1||presentStudents<0||presentStudents>totalStudents)return NextResponse.json({error:"Please enter valid student counts."},{status:400});
  const user=access.user!;
  const [updated]=await getDb().update(attendanceEntries).set({lectureDate:body.lectureDate,facultyName:user.role==="staff"?user.name:String(body.facultyName).trim(),department:user.role==="staff"?user.department:body.department,className:body.className,division:String(body.division).trim(),subjectName:String(body.subjectName).trim(),sessionType:body.sessionType,batch:body.sessionType==="Practical"?batch:"",periodTime:String(body.periodTime).trim(),totalStudents,presentStudents,remarks:String(body.remarks??"").trim()}).where(eq(attendanceEntries.id,id)).returning();
  return NextResponse.json(updated);
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const id=Number((await params).id);const access=await authorizedEntry(request,id);if(access.error)return access.error;
  await getDb().delete(attendanceOwnership).where(eq(attendanceOwnership.entryId,id));
  await getDb().delete(attendanceEntries).where(eq(attendanceEntries.id,id));
  return NextResponse.json({ok:true});
}
