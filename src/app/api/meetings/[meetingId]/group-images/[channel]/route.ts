import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { deleteMeetingPhotoFile, readMeetingPhotoFile, saveMeetingPhotoFile } from "@/lib/photo-storage";

type Params = { params: Promise<{ meetingId: string; channel: string }> };

const MAX_GROUP_IMAGE_BYTES = 2 * 1024 * 1024;

function normalizeChannel(channel: string) {
  return channel === "external" ? "external" : channel === "internal" ? "internal" : null;
}

type MeetingGroupImage = NonNullable<Awaited<ReturnType<typeof prisma.meeting.findUnique>>>;

function imageMeta(meeting: MeetingGroupImage, channel: "internal" | "external") {
  return channel === "internal"
    ? { storagePath: meeting.internalGroupImagePath, mimeType: meeting.internalGroupImageMime }
    : { storagePath: meeting.externalGroupImagePath, mimeType: meeting.externalGroupImageMime };
}

function imageUpdateData(channel: "internal" | "external", file: File, storagePath: string) {
  return channel === "internal"
    ? {
        internalGroupImageFilename: file.name,
        internalGroupImageMime: file.type,
        internalGroupImageSize: file.size,
        internalGroupImagePath: storagePath,
      }
    : {
        externalGroupImageFilename: file.name,
        externalGroupImageMime: file.type,
        externalGroupImageSize: file.size,
        externalGroupImagePath: storagePath,
      };
}

function imageClearData(channel: "internal" | "external") {
  return channel === "internal"
    ? {
        internalGroupImageFilename: null,
        internalGroupImageMime: null,
        internalGroupImageSize: null,
        internalGroupImagePath: null,
      }
    : {
        externalGroupImageFilename: null,
        externalGroupImageMime: null,
        externalGroupImageSize: null,
        externalGroupImagePath: null,
      };
}

export async function GET(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, channel: rawChannel } = await params;
  const channel = normalizeChannel(rawChannel);
  if (!channel) {
    return NextResponse.json({ message: "Invalid group image channel" }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({ where: { meetingId } });
  const { storagePath, mimeType } = meeting ? imageMeta(meeting, channel) : { storagePath: null, mimeType: null };
  if (!meeting || !storagePath || !mimeType) {
    return NextResponse.json({ message: "Group image not found" }, { status: 404 });
  }

  try {
    const file = await readMeetingPhotoFile(storagePath);
    return new NextResponse(new Uint8Array(file), {
      headers: { "Content-Type": mimeType, "Cache-Control": "private, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ message: "Group image file missing" }, { status: 404 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, channel: rawChannel } = await params;
  const channel = normalizeChannel(rawChannel);
  if (!channel) {
    return NextResponse.json({ message: "Invalid group image channel" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "Please select an image file." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ message: "Only image files are allowed." }, { status: 400 });
  }
  if (file.size > MAX_GROUP_IMAGE_BYTES) {
    return NextResponse.json({ message: "Group image must not exceed 2 MB." }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({ where: { meetingId } });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  const { storagePath: oldStoragePath } = imageMeta(meeting, channel);
  await deleteMeetingPhotoFile(oldStoragePath);
  const storagePath = await saveMeetingPhotoFile(meetingId, file);
  const updated = await prisma.meeting.update({
    where: { meetingId },
    data: imageUpdateData(channel, file, storagePath),
    include: {
      attendances: { orderBy: { personNo: "asc" } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { meetingId, channel: rawChannel } = await params;
  const channel = normalizeChannel(rawChannel);
  if (!channel) {
    return NextResponse.json({ message: "Invalid group image channel" }, { status: 400 });
  }

  const meeting = await prisma.meeting.findUnique({ where: { meetingId } });
  if (!meeting) {
    return NextResponse.json({ message: "Meeting not found" }, { status: 404 });
  }

  const { storagePath } = imageMeta(meeting, channel);
  await deleteMeetingPhotoFile(storagePath);
  const updated = await prisma.meeting.update({
    where: { meetingId },
    data: imageClearData(channel),
    include: {
      attendances: { orderBy: { personNo: "asc" } },
      photos: {
        orderBy: { createdAt: "desc" },
        select: { id: true, meetingId: true, filename: true, mimeType: true, size: true, createdAt: true },
      },
    },
  });

  return NextResponse.json(updated);
}
