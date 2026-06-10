import { mkdir, readFile, rm, unlink, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Attendee photos are stored on disk under uploads/meetings/<meetingId>/ instead
// of as base64 blobs in SQLite. Keeps the DB small and payloads light; the files
// are served back through an authenticated route, never as public static assets.
const UPLOAD_ROOT = process.env.SIGNMEETING_UPLOAD_DIR || path.join(process.cwd(), "uploads");

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

// Path stored in the DB is relative to UPLOAD_ROOT and contains no user input
// beyond the meeting id, so it cannot escape the upload directory.
export async function saveMeetingPhotoFile(meetingId: string, file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());
  const relativePath = path.posix.join(
    "meetings",
    meetingId,
    `${randomUUID()}${extensionFor(file.name, file.type)}`,
  );
  const absolutePath = path.join(UPLOAD_ROOT, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return relativePath;
}

export async function readMeetingPhotoFile(storagePath: string) {
  const absolutePath = path.join(UPLOAD_ROOT, storagePath);
  // Guard against path traversal in case a bad value ever reaches here.
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Invalid storage path");
  }
  return readFile(absolutePath);
}

export async function deleteMeetingPhotoFile(storagePath: string | null) {
  if (!storagePath) return;
  const absolutePath = path.join(UPLOAD_ROOT, storagePath);
  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) return;
  await unlink(absolutePath).catch(() => {});
}

// Removes a meeting's entire photo folder (used when the meeting is deleted).
export async function deleteMeetingPhotoDir(meetingId: string) {
  const dir = path.join(UPLOAD_ROOT, "meetings", meetingId);
  if (!dir.startsWith(UPLOAD_ROOT + path.sep)) return;
  await rm(dir, { recursive: true, force: true }).catch(() => {});
}
