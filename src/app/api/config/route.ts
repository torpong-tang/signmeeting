import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// Only these keys are writable; prevents arbitrary config injection via PUT.
const ALLOWED_KEYS = new Set(["meeting_running", "close_time"]);

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;
  const rows = await prisma.config.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}

export async function PUT(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const body = await request.json();
  const entries = Object.entries(body).filter(
    ([key, value]) => ALLOWED_KEYS.has(key) && value !== undefined && value !== null,
  );

  for (const [key, value] of entries) {
    await prisma.config.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) },
    });
  }

  const rows = await prisma.config.findMany({ orderBy: { key: "asc" } });
  return NextResponse.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
}
