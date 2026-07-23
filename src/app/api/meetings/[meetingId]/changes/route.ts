import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { MeetingFieldChange } from "@/lib/meeting-edit-policy";

type Params = { params: Promise<{ meetingId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const meeting = await prisma.meeting.findUnique({ where: { meetingId }, select: { id: true } });
  if (!meeting) return NextResponse.json({ message: "Meeting not found" }, { status: 404 });

  const rows = await prisma.meetingChangeLog.findMany({
    where: { meetingId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(
    rows.map((row) => ({
      id: row.id,
      meetingId: row.meetingId,
      changedBy: row.changedBy,
      createdAt: row.createdAt,
      changes: JSON.parse(row.changesJson) as MeetingFieldChange[],
    })),
  );
}
