import { NextResponse } from "next/server";
import { AttendanceType, MeetingType } from "@prisma/client";
import { createAttendance, DuplicateAttendanceError } from "@/lib/meeting";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ meetingId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const rows = await prisma.attendance.findMany({
    where: { meetingId },
    orderBy: { personNo: "asc" },
  });
  return NextResponse.json(rows);
}

export async function POST(request: Request, { params }: Params) {
  const { meetingId } = await params;
  const body = await request.json();
  const meeting = await prisma.meeting.findUnique({ where: { meetingId } });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }
  const channel = body.channel === AttendanceType.INTERNAL ? AttendanceType.INTERNAL : AttendanceType.EXTERNAL;
  if (meeting.meetingType === MeetingType.INTERNAL && channel === AttendanceType.EXTERNAL) {
    return NextResponse.json({ message: "ไม่เปิดลงทะเบียนสำหรับผู้ร่วมประชุมในรายการประชุมนี้" }, { status: 403 });
  }

  const config = await prisma.config.findUnique({ where: { key: "close_time" } });
  const limitMinutes = Number.parseInt(config?.value ?? "15", 10) || 15;
  const meetingStart = new Date(`${meeting.meetingDate}T${meeting.startTime || "00:00"}:00+07:00`);
  const deadline = new Date(meetingStart.getTime() + limitMinutes * 60 * 1000);
  if (!meeting.allowLateRegister && Date.now() > deadline.getTime()) {
    return NextResponse.json(
      { message: `Registration closed after ${limitMinutes} minutes. Please contact the meeting admin.` },
      { status: 403 },
    );
  }

  const parsedIntPid = Number(body.intPid);
  const intPid = channel === AttendanceType.INTERNAL && Number.isInteger(parsedIntPid) ? parsedIntPid : null;

  try {
    const row = await createAttendance({
      meetingId,
      channel,
      intPid,
      fname: String(body.fname ?? "").trim(),
      lname: String(body.lname ?? "").trim(),
      department: String(body.department ?? "").trim(),
      position: String(body.position ?? "").trim(),
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateAttendanceError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    throw error;
  }
}
