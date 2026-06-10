import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function nextMeetingId() {
  const year = new Date().getFullYear();
  // Make sure the counter row exists (idempotent, no-op when present).
  await prisma.config.upsert({
    where: { key: "meeting_running" },
    update: {},
    create: { key: "meeting_running", value: "1" },
  });
  // Increment and read back the just-consumed value in a single statement.
  // SQLite serialises writers, so concurrent meeting creations can never read
  // the same running number or lose an increment.
  const rows = await prisma.$queryRaw<{ assigned: number | bigint }[]>`
    UPDATE "Config"
    SET "value" = CAST(CAST("value" AS INTEGER) + 1 AS TEXT)
    WHERE "key" = 'meeting_running'
    RETURNING CAST("value" AS INTEGER) - 1 AS assigned
  `;
  const current = Number(rows[0]?.assigned ?? 1) || 1;
  return `MTG-${year}-${String(current).padStart(4, "0")}`;
}

export async function nextPersonNo(meetingId: string) {
  const latest = await prisma.attendance.findFirst({
    where: { meetingId },
    orderBy: { personNo: "desc" },
    select: { personNo: true },
  });
  return (latest?.personNo ?? 0) + 1;
}

// Thrown when the same person tries to register for a meeting twice. The route
// maps this to HTTP 409 with the Thai message below.
export class DuplicateAttendanceError extends Error {
  constructor(message = "คุณได้ลงทะเบียนการประชุมนี้ไปแล้ว") {
    super(message);
    this.name = "DuplicateAttendanceError";
  }
}

type AttendanceInput = {
  meetingId: string;
  channel: Prisma.AttendanceCreateManyInput["channel"];
  intPid?: number | null;
  fname: string;
  lname: string;
  department: string;
  position: string;
};

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

// Identity used to detect duplicate registrations within one meeting:
//   internal → the selected personnel id (intPid)
//   external → normalized name + department (free-text entry)
function buildDedupeKey(input: AttendanceInput) {
  if (input.channel === "INTERNAL" && input.intPid != null) {
    return `int:${input.intPid}`;
  }
  return `ext:${normalize(input.fname)}|${normalize(input.lname)}|${normalize(input.department)}`;
}

// Allocates the next personNo and inserts the attendance row.
// - Rejects duplicates of the same person (app-level pre-check + the
//   [meetingId, dedupeKey] unique constraint as a race-safe backstop).
// - Retries when a concurrent registration grabs the same personNo first
//   (unique [meetingId, personNo] constraint); without this, simultaneous
//   sign-ins would 500.
export async function createAttendance(input: AttendanceInput) {
  const dedupeKey = buildDedupeKey(input);

  const existing = await prisma.attendance.findFirst({
    where: { meetingId: input.meetingId, dedupeKey },
    select: { id: true },
  });
  if (existing) {
    throw new DuplicateAttendanceError();
  }

  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const personNo = await nextPersonNo(input.meetingId);
    try {
      return await prisma.attendance.create({
        data: {
          personNo,
          meetingId: input.meetingId,
          channel: input.channel,
          intPid: input.intPid ?? null,
          fname: input.fname,
          lname: input.lname,
          department: input.department,
          position: input.position,
          dedupeKey,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // A concurrent insert won the race. Tell the two conflicts apart by
        // which unique index tripped.
        if (JSON.stringify(error.meta?.target ?? "").includes("dedupeKey")) {
          throw new DuplicateAttendanceError();
        }
        if (attempt < maxAttempts) {
          continue; // personNo collision — recompute and retry
        }
      }
      throw error;
    }
  }
  throw new Error("Unable to assign a unique attendance number");
}

export function createRegisterToken() {
  return randomBytes(24).toString("base64url");
}

export function buildRegisterUrls(origin: string, meetingId: string, tokens?: { int?: string; ext?: string }) {
  const base = origin.replace("127.0.0.1", "localhost").replace(/\/$/, "");
  return {
    qrUrlInt: `${base}/register/${tokens?.int ?? meetingId}/internal`,
    qrUrlExt: `${base}/register/${tokens?.ext ?? meetingId}/external`,
  };
}
