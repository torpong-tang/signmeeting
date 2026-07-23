import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { readMeetingPhotoFile } from "@/lib/photo-storage";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ meetingId: string; attendanceId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { meetingId, attendanceId } = await params;
  const attendance = await prisma.attendance.findFirst({
    where: { id: attendanceId, meetingId },
    select: { signaturePath: true },
  });
  if (!attendance?.signaturePath) {
    return NextResponse.json({ message: "Signature not found" }, { status: 404 });
  }

  const image = await readMeetingPhotoFile(attendance.signaturePath);
  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${attendanceId}-signature.png"`,
    },
  });
}
