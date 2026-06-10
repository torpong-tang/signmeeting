import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { saveMeetingPhotoFile } from "@/lib/photo-storage";

type Params = { params: Promise<{ meetingId: string }> };

const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const photos = await prisma.meetingPhoto.findMany({
    where: { meetingId },
    orderBy: { createdAt: "desc" },
    select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
  });
  return NextResponse.json(photos);
}

export async function POST(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const formData = await request.formData();
  const files = formData
    .getAll("files")
    .filter((item): item is File => item instanceof File)
    .filter((file) => file.type.startsWith("image/"));

  const existing = await prisma.meetingPhoto.findMany({ where: { meetingId }, select: { size: true } });
  const existingTotal = existing.reduce((sum, item) => sum + item.size, 0);
  const newTotal = files.reduce((sum, file) => sum + file.size, existingTotal);

  if (newTotal > MAX_TOTAL_BYTES) {
    return NextResponse.json({ message: "Attachment total size must not exceed 20 MB per meeting." }, { status: 400 });
  }

  const created = [];
  for (const file of files) {
    const storagePath = await saveMeetingPhotoFile(meetingId, file);
    created.push(
      await prisma.meetingPhoto.create({
        data: {
          meetingId,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          storagePath,
        },
        select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
      }),
    );
  }

  return NextResponse.json(created, { status: 201 });
}
