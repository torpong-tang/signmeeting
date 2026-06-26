import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { deleteMeetingPhotoDir } from "@/lib/photo-storage";

type Params = { params: Promise<{ meetingId: string }> };

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
  return { meetingProjectName, meetingName, meetingDate, startTime, endTime, meetingLocation, meetingType, internalMeetingName, externalMeetingName };
}

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { meetingId },
    include: { attendances: { orderBy: { personNo: "asc" } }, photos: { orderBy: { createdAt: "desc" } } },
  });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json(meeting);
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const body = await request.json();
  const normalized = normalizeMeetingBody(body);
  if ("error" in normalized) {
    return NextResponse.json({ message: normalized.error }, { status: 400 });
  }
  // meetingType is intentionally not updatable: the QR links and any existing
  // attendances are tied to it, so it is fixed once the meeting is created.
  const meeting = await prisma.meeting.update({
    where: { meetingId },
    data: {
      meetingProjectName: normalized.meetingProjectName,
      meetingName: normalized.meetingName,
      meetingDate: normalized.meetingDate,
      startTime: normalized.startTime,
      endTime: normalized.endTime,
      meetingLocation: normalized.meetingLocation,
      internalMeetingName: normalized.internalMeetingName,
      externalMeetingName: normalized.meetingType === "EXTERNAL" ? normalized.externalMeetingName : null,
      allowLateRegister: Boolean(body.allowLateRegister ?? false),
    },
    include: {
      attendances: { orderBy: { personNo: "asc" } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
      },
    },
  });
  return NextResponse.json(meeting);
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  await prisma.meeting.delete({ where: { meetingId } });
  await deleteMeetingPhotoDir(meetingId);
  return NextResponse.json({ ok: true });
}
