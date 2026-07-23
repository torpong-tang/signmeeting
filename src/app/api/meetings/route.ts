import { NextResponse } from "next/server";
import { MeetingType } from "@prisma/client";
import { buildRegisterUrls, createRegisterToken, nextMeetingId } from "@/lib/meeting";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { normalizeMeetingInput } from "@/lib/meeting-input";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const meetings = await prisma.meeting.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      attendances: { orderBy: { personNo: "asc" } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
      },
    },
  });
  return NextResponse.json(meetings);
}

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const body = await request.json();
  const normalized = normalizeMeetingInput(body, { rejectPast: true });
  if ("error" in normalized) {
    return NextResponse.json({ message: normalized.error }, { status: 400 });
  }
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const meetingId = await nextMeetingId();
  const qrTokenInt = createRegisterToken();
  const qrTokenExt = createRegisterToken();
  const { qrUrlInt, qrUrlExt } = buildRegisterUrls(origin, meetingId, { int: qrTokenInt, ext: qrTokenExt });

  const meeting = await prisma.meeting.create({
    data: {
      meetingId,
      meetingProjectName: normalized.meetingProjectName,
      meetingName: normalized.meetingName,
      meetingDate: normalized.meetingDate,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      meetingLocation: normalized.meetingLocation,
      meetingType: normalized.meetingType in MeetingType ? (normalized.meetingType as MeetingType) : MeetingType.EXTERNAL,
      internalMeetingName: normalized.internalMeetingName,
      externalMeetingName: normalized.meetingType === "EXTERNAL" ? normalized.externalMeetingName : null,
      allowLateRegister: body.allowLateRegister === true,
      qrTokenInt,
      qrTokenExt,
      qrUrlInt,
      qrUrlExt,
    },
    include: { attendances: true, photos: true },
  });

  return NextResponse.json(meeting, { status: 201 });
}
