import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { deleteMeetingPhotoDir } from "@/lib/photo-storage";

type Params = { params: Promise<{ meetingId: string }> };

function normalizeMeetingBody(body: Record<string, unknown>) {
  const meetingProjectName = String(body.meetingProjectName ?? "").trim();
  const meetingName = String(body.meetingName ?? "").trim();
  const meetingDate = String(body.meetingDate ?? "").trim();
  const startTime = String(body.startTime ?? "").trim();
  const meetingLocation = String(body.meetingLocation ?? "").trim();
  const meetingType = String(body.meetingType ?? "EXTERNAL");
  if (!meetingProjectName || !meetingName || !meetingDate || !startTime || !meetingLocation) {
    return { error: "All meeting fields are required." };
  }
  return { meetingProjectName, meetingName, meetingDate, startTime, meetingLocation, meetingType };
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
      meetingLocation: normalized.meetingLocation,
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
