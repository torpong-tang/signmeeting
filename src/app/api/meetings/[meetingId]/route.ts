import { NextResponse } from "next/server";
import { MeetingType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession, requireAuth } from "@/lib/auth";
import { deleteMeetingFiles } from "@/lib/meeting-file-storage";
import { normalizeMeetingInput } from "@/lib/meeting-input";
import { buildMeetingFieldChanges, validateMeetingEditPolicy } from "@/lib/meeting-edit-policy";

type Params = { params: Promise<{ meetingId: string }> };

class MeetingUpdateError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const meeting = await prisma.meeting.findUnique({
    where: { meetingId },
    include: {
      attendances: { orderBy: { personNo: "asc" } },
      photos: { orderBy: { createdAt: "desc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }
  return NextResponse.json(meeting);
}

export async function PUT(request: Request, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const { meetingId } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  try {
    const meeting = await prisma.$transaction(async (tx) => {
      const existing = await tx.meeting.findUnique({
        where: { meetingId },
        include: { attendances: { select: { channel: true } } },
      });
      if (!existing) throw new MeetingUpdateError("Meeting not found", 404);

      const expectedUpdatedAt = String(body.expectedUpdatedAt ?? "");
      if (!expectedUpdatedAt || Number.isNaN(new Date(expectedUpdatedAt).getTime())) {
        throw new MeetingUpdateError("Missing or invalid meeting version. Please reload and try again.", 400, {
          code: "INVALID_VERSION",
        });
      }
      if (new Date(expectedUpdatedAt).getTime() !== existing.updatedAt.getTime()) {
        throw new MeetingUpdateError("ข้อมูลการประชุมถูกแก้ไขจากหน้าจออื่นแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก", 409, {
          code: "STALE_VERSION",
        });
      }

      const requestedMeetingType = String(body.meetingType ?? existing.meetingType);
      if (requestedMeetingType !== MeetingType.INTERNAL && requestedMeetingType !== MeetingType.EXTERNAL) {
        throw new MeetingUpdateError("Meeting Type is invalid.", 400);
      }
      const normalized = normalizeMeetingInput({
        ...body,
        meetingType: existing.meetingType,
        externalParticipantGroupId:
          Object.prototype.hasOwnProperty.call(body, "externalParticipantGroupId")
            ? body.externalParticipantGroupId
            : existing.externalParticipantGroupId,
      });
      if ("error" in normalized) throw new MeetingUpdateError(normalized.error, 400);
      if (existing.meetingType === MeetingType.EXTERNAL && normalized.externalParticipantGroupId) {
        const participantGroup = await tx.participantGroup.findFirst({
          where: { groupId: normalized.externalParticipantGroupId, isActive: true },
          select: { name: true },
        });
        if (!participantGroup) {
          throw new MeetingUpdateError("กรุณาเลือกกลุ่มผู้ร่วมประชุมที่ยังใช้งานอยู่", 400);
        }
        normalized.externalMeetingName =
          normalized.externalParticipantGroupId === existing.externalParticipantGroupId &&
          existing.externalMeetingName
            ? existing.externalMeetingName
            : participantGroup.name;
      } else if (
        existing.meetingType === MeetingType.EXTERNAL &&
        normalized.externalMeetingName &&
        normalized.externalMeetingName !== existing.externalMeetingName
      ) {
        throw new MeetingUpdateError("กรุณาเลือกชื่อกลุ่มผู้ร่วมประชุมจาก Master Data", 400);
      }

      const allowLateRegister = body.allowLateRegister === true;
      const changes = buildMeetingFieldChanges(existing, normalized, allowLateRegister);
      const violation = validateMeetingEditPolicy({
        existing,
        next: normalized,
        requestedMeetingType,
        changes,
      });
      if (violation) {
        throw new MeetingUpdateError(violation.message, 409, {
          code: "EDIT_POLICY_VIOLATION",
          lockedFields: violation.lockedFields,
        });
      }

      if (changes.length === 0) {
        return tx.meeting.findUniqueOrThrow({
          where: { meetingId },
          include: {
            attendances: { orderBy: { personNo: "asc" } },
            photos: {
              orderBy: { createdAt: "desc" },
              select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
            },
            documents: {
              orderBy: { createdAt: "desc" },
              select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
            },
          },
        });
      }

      // Meeting Type and QR identifiers are deliberately absent from this
      // update. They are immutable once the meeting has been created.
      const updated = await tx.meeting.update({
        where: { meetingId, updatedAt: existing.updatedAt },
        data: {
          meetingProjectName: normalized.meetingProjectName,
          meetingName: normalized.meetingName,
          meetingDate: normalized.meetingDate,
          startTime: normalized.startTime,
          endTime: normalized.endTime,
          meetingLocation: normalized.meetingLocation,
          internalMeetingName: normalized.internalMeetingName,
          externalMeetingName: existing.meetingType === MeetingType.EXTERNAL ? normalized.externalMeetingName || null : null,
          externalParticipantGroupId:
            existing.meetingType === MeetingType.EXTERNAL
              ? normalized.externalParticipantGroupId
              : null,
          allowLateRegister,
        },
        include: {
          attendances: { orderBy: { personNo: "asc" } },
          photos: {
            orderBy: { createdAt: "desc" },
            select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
          },
          documents: {
            orderBy: { createdAt: "desc" },
            select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
          },
        },
      });
      await tx.meetingChangeLog.create({
        data: {
          meetingId,
          changedBy: session.u,
          changesJson: JSON.stringify(changes),
        },
      });
      return updated;
    });
    return NextResponse.json(meeting);
  } catch (error) {
    if (error instanceof MeetingUpdateError) {
      return NextResponse.json({ message: error.message, ...error.details }, { status: error.status });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { message: "ข้อมูลการประชุมถูกแก้ไขแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึก", code: "STALE_VERSION" },
        { status: 409 },
      );
    }
    throw error;
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  await prisma.meeting.delete({ where: { meetingId } });
  await deleteMeetingFiles(meetingId);
  return NextResponse.json({ ok: true });
}
