import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteMeetingFile,
  saveMeetingDocumentFile,
} from "@/lib/meeting-file-storage";

type Params = { params: Promise<{ meetingId: string }> };

const MAX_TOTAL_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const documentSelect = {
  id: true,
  meetingId: true,
  filename: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;
  const documents = await prisma.meetingDocument.findMany({
    where: { meetingId },
    orderBy: { createdAt: "desc" },
    select: documentSelect,
  });
  return NextResponse.json(documents);
}

export async function POST(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId } = await params;

  const meeting = await prisma.meeting.findUnique({
    where: { meetingId },
    select: { meetingId: true },
  });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const files = formData.getAll("files").filter((item): item is File => item instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ message: "กรุณาเลือกเอกสารอย่างน้อย 1 ไฟล์" }, { status: 400 });
  }

  const unsupported = files.find((file) => !ALLOWED_MIME_TYPES.has(file.type));
  if (unsupported) {
    return NextResponse.json(
      { message: `ไม่รองรับไฟล์ ${unsupported.name} กรุณาใช้ PDF, Word, Excel, PowerPoint, TXT, JPG, PNG หรือ WEBP` },
      { status: 400 },
    );
  }

  const existing = await prisma.meetingDocument.findMany({
    where: { meetingId },
    select: { size: true },
  });
  const existingTotal = existing.reduce((sum, item) => sum + item.size, 0);
  const requestedTotal = files.reduce((sum, file) => sum + file.size, existingTotal);
  if (requestedTotal > MAX_TOTAL_BYTES) {
    return NextResponse.json(
      { message: "ขนาดเอกสารรวมต้องไม่เกิน 20 MB ต่อการประชุม" },
      { status: 400 },
    );
  }

  const created = [];
  const storedPaths: string[] = [];
  try {
    for (const file of files) {
      const storagePath = await saveMeetingDocumentFile(meetingId, file);
      storedPaths.push(storagePath);
      created.push(
        await prisma.meetingDocument.create({
          data: {
            meetingId,
            filename: file.name,
            mimeType: file.type,
            size: file.size,
            storagePath,
          },
          select: documentSelect,
        }),
      );
    }
  } catch (error) {
    await prisma.meetingDocument.deleteMany({
      where: { meetingId, storagePath: { in: storedPaths } },
    });
    await Promise.all(storedPaths.map((storagePath) => deleteMeetingFile(storagePath)));
    throw error;
  }

  return NextResponse.json(created, { status: 201 });
}
