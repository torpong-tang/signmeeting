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
  const internalPerson = intPid
    ? await prisma.internalPerson.findFirst({ where: { intPid, isActive: true } })
    : null;
  if (channel === AttendanceType.INTERNAL && !internalPerson) {
    return NextResponse.json({ message: "กรุณาเลือกผู้ปฏิบัติงานที่ใช้งานอยู่" }, { status: 400 });
  }

  const parsedParticipantId = Number(body.participantId);
  const participantId =
    channel === AttendanceType.EXTERNAL &&
    Number.isInteger(parsedParticipantId) &&
    parsedParticipantId > 0
      ? parsedParticipantId
      : null;
  const participantPerson = participantId && meeting.externalParticipantGroupId
    ? await prisma.participantPerson.findFirst({
        where: {
          participantId,
          groupId: meeting.externalParticipantGroupId,
          isActive: true,
          group: { isActive: true },
        },
      })
    : null;
  if (participantId && !participantPerson) {
    return NextResponse.json(
      { message: "รายชื่อผู้ร่วมประชุมไม่อยู่ในกลุ่มที่กำหนด หรือไม่ได้ใช้งานแล้ว" },
      { status: 400 },
    );
  }

  const attendanceData = channel === AttendanceType.INTERNAL && internalPerson
    ? {
        fname: internalPerson.fname,
        lname: internalPerson.lname,
        department: meeting.internalMeetingName.trim() || "ผู้ปฏิบัติงาน",
        position: internalPerson.position,
        email: internalPerson.email,
        phone: internalPerson.phone,
      }
    : channel === AttendanceType.EXTERNAL && participantPerson
      ? {
          fname: participantPerson.fname,
          lname: participantPerson.lname,
          department: meeting.externalMeetingName?.trim() || "ผู้ร่วมประชุม",
          position: participantPerson.position,
          email: String(body.email ?? "").trim() || participantPerson.email?.trim() || "",
          phone: String(body.phone ?? "").trim() || participantPerson.phone?.trim() || "",
        }
    : {
        fname: String(body.fname ?? "").trim(),
        lname: String(body.lname ?? "").trim(),
        department: meeting.externalMeetingName?.trim() || String(body.department ?? "").trim(),
        position: String(body.position ?? "").trim(),
        email: String(body.email ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
      };
  if (!attendanceData.fname || !attendanceData.lname || !attendanceData.department || !attendanceData.position) {
    return NextResponse.json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" }, { status: 400 });
  }
  if (channel === AttendanceType.EXTERNAL) {
    if (attendanceData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendanceData.email)) {
      return NextResponse.json({ message: "กรุณากรอก E-mail ให้ถูกต้อง" }, { status: 400 });
    }
  }
  const signatureData = String(body.signatureData ?? "");
  if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(signatureData)) {
    return NextResponse.json({ message: "กรุณาลงลายมือชื่อก่อนบันทึก" }, { status: 400 });
  }
  const signatureSize = Buffer.from(signatureData.slice(signatureData.indexOf(",") + 1), "base64").length;
  if (signatureSize === 0 || signatureSize > 512 * 1024) {
    return NextResponse.json({ message: "ลายมือชื่อต้องมีขนาดไม่เกิน 512 KB" }, { status: 400 });
  }

  try {
    const row = await createAttendance({
      meetingId,
      channel,
      intPid,
      participantId,
      ...attendanceData,
      signatureData,
    });
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateAttendanceError) {
      return NextResponse.json({ message: error.message }, { status: 409 });
    }
    throw error;
  }
}
