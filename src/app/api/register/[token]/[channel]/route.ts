import { NextResponse } from "next/server";
import { AttendanceType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ token: string; channel: string }> };

function getDeadline(meetingDate: string, startTime: string, limitMinutes: number) {
  const meetingStart = new Date(`${meetingDate}T${startTime || "00:00"}:00+07:00`);
  return new Date(meetingStart.getTime() + limitMinutes * 60 * 1000);
}

export async function GET(_request: Request, { params }: Params) {
  const { token, channel } = await params;
  if (channel !== "internal" && channel !== "external") {
    return NextResponse.json({ message: "Registration channel is invalid" }, { status: 404 });
  }
  const attendanceChannel = channel === "internal" ? AttendanceType.INTERNAL : AttendanceType.EXTERNAL;
  const meeting = await prisma.meeting.findFirst({
    where:
      attendanceChannel === AttendanceType.INTERNAL
        ? { qrTokenInt: token }
        : { qrTokenExt: token, meetingType: "EXTERNAL" },
    // Only intPid is needed (to hide already-registered people from the
    // dropdown); avoid exposing other attendees' personal data on this public
    // endpoint.
    include: { attendances: { orderBy: { personNo: "asc" }, select: { intPid: true } } },
  });

  if (!meeting) {
    return NextResponse.json({ message: "Registration link is invalid" }, { status: 404 });
  }

  const config = await prisma.config.findUnique({ where: { key: "close_time" } });
  const limitMinutes = Number.parseInt(config?.value ?? "15", 10) || 15;
  const deadline = getDeadline(meeting.meetingDate, meeting.startTime, limitMinutes);
  const isClosed = !meeting.allowLateRegister && Date.now() > deadline.getTime();

  return NextResponse.json({
    meeting,
    channel: attendanceChannel,
    limitMinutes,
    deadline: deadline.toISOString(),
    isClosed,
  });
}
