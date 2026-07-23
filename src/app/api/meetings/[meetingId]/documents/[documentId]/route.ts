import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  deleteMeetingFile,
  readMeetingFile,
} from "@/lib/meeting-file-storage";

type Params = { params: Promise<{ meetingId: string; documentId: string }> };

function contentDisposition(filename: string) {
  const asciiFallback = filename.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${asciiFallback || "document"}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, documentId } = await params;
  const document = await prisma.meetingDocument.findFirst({
    where: { id: documentId, meetingId },
  });
  if (!document) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  try {
    const file = await readMeetingFile(document.storagePath);
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": document.mimeType,
        "Content-Disposition": contentDisposition(document.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ message: "Document file missing" }, { status: 404 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, documentId } = await params;
  const document = await prisma.meetingDocument.findFirst({
    where: { id: documentId, meetingId },
  });
  if (!document) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  await deleteMeetingFile(document.storagePath);
  await prisma.meetingDocument.delete({ where: { id: document.id } });
  return NextResponse.json({ ok: true });
}
