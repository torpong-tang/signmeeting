import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { deleteMeetingPhotoFile, readMeetingPhotoFile } from "@/lib/photo-storage";

type Params = { params: Promise<{ meetingId: string; photoId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, photoId } = await params;
  const photo = await prisma.meetingPhoto.findFirst({ where: { id: photoId, meetingId } });
  if (!photo) {
    return NextResponse.json({ message: "Photo not found" }, { status: 404 });
  }

  // New photos live on disk; legacy rows may still carry a base64 data URL.
  if (photo.storagePath) {
    try {
      const file = await readMeetingPhotoFile(photo.storagePath);
      return new NextResponse(new Uint8Array(file), {
        headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=3600" },
      });
    } catch {
      return NextResponse.json({ message: "Photo file missing" }, { status: 404 });
    }
  }

  if (photo.data) {
    const base64 = photo.data.split(",")[1] ?? "";
    return new NextResponse(new Uint8Array(Buffer.from(base64, "base64")), {
      headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=3600" },
    });
  }

  return NextResponse.json({ message: "Photo file missing" }, { status: 404 });
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, photoId } = await params;
  const photo = await prisma.meetingPhoto.findFirst({ where: { id: photoId, meetingId } });
  if (photo) {
    await deleteMeetingPhotoFile(photo.storagePath);
    await prisma.meetingPhoto.deleteMany({ where: { id: photoId, meetingId } });
  }
  return NextResponse.json({ ok: true });
}
