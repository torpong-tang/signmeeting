import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { deleteMeetingPhotoFile } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ meetingId: string; attendanceId: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { meetingId, attendanceId } = await params;
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, meetingId },
    select: { id: true, signaturePath: true },
  });
  if (!attendance) {
    return NextResponse.json({ message: "Attendance not found" }, { status: 404 });
  }

  await prisma.attendance.delete({ where: { id: attendance.id } });
  await deleteMeetingPhotoFile(attendance.signaturePath);
  return NextResponse.json({ ok: true });
}
