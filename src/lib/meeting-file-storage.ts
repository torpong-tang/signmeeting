import { mkdir, readFile, rm, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Meeting photos, documents, group images, and signatures live on disk instead
// of as SQLite blobs. Routes serve them through authenticated endpoints.
const UPLOAD_ROOT =
  process.env.SIGNMEETING_UPLOAD_DIR ||
  path.join(/*turbopackIgnore: true*/ process.cwd(), "uploads");

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "image/heif": ".heif",
};

function extensionFor(filename: string, mimeType: string) {
  const fromName = path.extname(filename).toLowerCase();
  if (fromName) return fromName;
  return EXTENSION_BY_MIME[mimeType] ?? "";
}

async function saveMeetingFile(meetingId: string, directory: string | null, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = path.posix.join(
    "meetings",
    meetingId,
    ...(directory ? [directory] : []),
    `${randomUUID()}${extensionFor(file.name, file.type)}`,
  );
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

export async function saveMeetingPhotoFile(meetingId: string, file: File) {
  return saveMeetingFile(meetingId, null, file);
}

export async function saveMeetingDocumentFile(meetingId: string, file: File) {
  return saveMeetingFile(meetingId, "documents", file);
}

export async function saveAttendanceSignatureFile(meetingId: string, signatureData: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(signatureData);
  if (!match) throw new Error("Invalid signature image");

  const buffer = Buffer.from(match[1], "base64");
  if (buffer.length === 0 || buffer.length > 512 * 1024) {
    throw new Error("Signature image must not exceed 512 KB");
  }

  const relativePath = path.posix.join("meetings", meetingId, "signatures", `${randomUUID()}.png`);
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

export async function readMeetingFile(storagePath: string) {
  const absolutePath = path.join(UPLOAD_ROOT, storagePath);
  // Guard against path traversal in case a bad value ever reaches here.
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return readFile(absolutePath);
}

export async function deleteMeetingFile(storagePath: string | null) {
  if (!storagePath) return;
  const absolutePath = path.join(UPLOAD_ROOT, storagePath);
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  await unlink(absolutePath).catch(() => {});
}

// Removes every stored asset for the meeting after the database cascade.
export async function deleteMeetingFiles(meetingId: string) {
  const dir = path.join(UPLOAD_ROOT, "meetings", meetingId);
  if (!dir.startsWith(UPLOAD_ROOT + path.sep)) return;
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}
