import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeParticipantPersonInput,
  validateParticipantPersonInput,
} from "@/lib/participant-input";

type Params = { params: Promise<{ groupId: string }> };

export async function POST(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const { groupId: rawGroupId } = await params;
  const groupId = Number(rawGroupId);
  if (!Number.isInteger(groupId) || groupId <= 0) {
    return NextResponse.json({ error: "Invalid group ID" }, { status: 400 });
  }

  const group = await prisma.participantGroup.findFirst({ where: { groupId, isActive: true } });
  if (!group) return NextResponse.json({ error: "ไม่พบกลุ่มผู้ร่วมประชุม" }, { status: 404 });

  const body = (await request.json()) as Record<string, unknown>;
  const person = normalizeParticipantPersonInput(body);
  const validationError = validateParticipantPersonInput(person);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const created = await prisma.participantPerson.create({
    data: {
      groupId,
      fname: person.fname,
      lname: person.lname,
      position: person.position,
      email: person.email || null,
      phone: person.phone || null,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
