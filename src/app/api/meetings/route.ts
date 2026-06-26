import { NextResponse } from "next/server";
import { MeetingType } from "@prisma/client";
import { buildRegisterUrls, createRegisterToken, nextMeetingId } from "@/lib/meeting";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

function defaultEndTime(startTime: string) {
  const [hourText, minuteText] = startTime.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  const date = new Date(Date.UTC(2000, 0, 1, hour, minute));
  date.setUTCHours(date.getUTCHours() + 1);
  if (date.getUTCDate() !== 1) return "23:59";
  return `${String(date.getUTCHours()).padStart(2, "0")}:${String(date.getUTCMinutes()).padStart(2, "0")}`;
}

function normalizeMeetingBody(body: Record<string, unknown>) {
  const meetingProjectName = String(body.meetingProjectName ?? "").trim();
  const meetingName = String(body.meetingName ?? "").trim();
  const meetingDate = String(body.meetingDate ?? "").trim();
  const startTime = String(body.startTime ?? "").trim();
  const endTime = String(body.endTime ?? "").trim() || defaultEndTime(startTime);
  const meetingLocation = String(body.meetingLocation ?? "").trim();
  const meetingType = String(body.meetingType ?? "EXTERNAL");
  const internalMeetingName = String(body.internalMeetingName ?? "Smarterware").trim() || "Smarterware";
  const externalMeetingName = String(body.externalMeetingName ?? "").trim();
  if (!meetingProjectName || !meetingName || !meetingDate || !startTime || !endTime || !meetingLocation) {
    return { error: "All meeting fields are required." };
  }
  if (endTime <= startTime) {
    return { error: "End Time must be later than Start Time." };
  }
  if (new Date(`${meetingDate}T${startTime}:00+07:00`).getTime() < Date.now()) {
    return { error: "Meeting date and time cannot be in the past." };
  }
  return { meetingProjectName, meetingName, meetingDate, startTime, endTime, meetingLocation, meetingType, internalMeetingName, externalMeetingName };
}

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
  const normalized = normalizeMeetingBody(body);
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
      allowLateRegister: Boolean(body.allowLateRegister ?? false),
      qrTokenInt,
      qrTokenExt,
      qrUrlInt,
      qrUrlExt,
    },
    include: { attendances: true, photos: true },
  });

  return NextResponse.json(meeting, { status: 201 });
}
