import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeParticipantGroupName,
  validateParticipantGroupName,
} from "@/lib/participant-input";

type Params = { params: Promise<{ groupId: string }> };

function parseGroupId(value: string) {
  const groupId = Number(value);
  return Number.isInteger(groupId) && groupId > 0 ? groupId : null;
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { groupId: rawGroupId } = await params;
  const groupId = parseGroupId(rawGroupId);
  if (!groupId) return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });

  const body = (await request.json()) as Record<string, unknown>;
  const name = normalizeParticipantGroupName(body.name);
  const validationError = validateParticipantGroupName(name);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const duplicate = await prisma.participantGroup.findFirst({
    where: { name, groupId: { not: groupId }, isActive: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "ชื่อกลุ่มผู้ร่วมประชุมนี้มีอยู่แล้ว" }, { status: 409 });
  }

  const result = await prisma.participantGroup.updateMany({
    where: { groupId, isActive: true },
    data: { name },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "ไม่พบกลุ่มผู้ร่วมประชุม" }, { status: 404 });
  }

  const group = await prisma.participantGroup.findUnique({
    where: { groupId },
    include: { people: { where: { isActive: true } } },
  });
  return NextResponse.json(group);
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { groupId: rawGroupId } = await params;
  const groupId = parseGroupId(rawGroupId);
  if (!groupId) return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });

  const group = await prisma.participantGroup.findFirst({ where: { groupId, isActive: true } });
  if (!group) return NextResponse.json({ error: "ไม่พบกลุ่มผู้ร่วมประชุม" }, { status: 404 });

  await prisma.$transaction([
    prisma.participantPerson.updateMany({
      where: { groupId, isActive: true },
      data: { isActive: false },
    }),
    prisma.participantGroup.update({
      where: { groupId },
      data: { isActive: false },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
