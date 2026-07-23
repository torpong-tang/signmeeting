import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeParticipantGroupName,
  validateParticipantGroupName,
} from "@/lib/participant-input";

export async function GET() {
  const denied = await requireAuth();
  if (denied) return denied;

  const groups = await prisma.participantGroup.findMany({
    where: { isActive: true },
    include: {
      people: {
        where: { isActive: true },
        orderBy: [{ fname: "asc" }, { lname: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(groups);
}

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;

  const body = (await request.json()) as Record<string, unknown>;
  const name = normalizeParticipantGroupName(body.name);
  const validationError = validateParticipantGroupName(name);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const existing = await prisma.participantGroup.findUnique({ where: { name } });
  if (existing?.isActive) {
    return NextResponse.json({ error: "ชื่อกลุ่มผู้ร่วมประชุมนี้มีอยู่แล้ว" }, { status: 409 });
  }

  const group = existing
    ? await prisma.participantGroup.update({
        where: { groupId: existing.groupId },
        data: { isActive: true },
        include: { people: { where: { isActive: true } } },
      })
    : await prisma.participantGroup.create({
        data: { name },
        include: { people: true },
      });

  return NextResponse.json(group, { status: 201 });
}
