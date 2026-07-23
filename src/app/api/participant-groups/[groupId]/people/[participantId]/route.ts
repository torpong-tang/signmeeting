import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizeParticipantPersonInput,
  validateParticipantPersonInput,
} from "@/lib/participant-input";

type Params = { params: Promise<{ groupId: string; participantId: string }> };

function parseIds(groupValue: string, participantValue: string) {
  const groupId = Number(groupValue);
  const participantId = Number(participantValue);
  if (
    !Number.isInteger(groupId) ||
    groupId <= 0 ||
    !Number.isInteger(participantId) ||
    participantId <= 0
  ) {
    return null;
  }
  return { groupId, participantId };
}

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const values = await params;
  const ids = parseIds(values.groupId, values.participantId);
  if (!ids) return NextResponse.json({ error: "Invalid participant ID" }, { status: 400 });

  const body = (await request.json()) as Record<string, unknown>;
  const person = normalizeParticipantPersonInput(body);
  const validationError = validateParticipantPersonInput(person);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const result = await prisma.participantPerson.updateMany({
    where: { ...ids, isActive: true, group: { isActive: true } },
    data: {
      fname: person.fname,
      lname: person.lname,
      position: person.position,
      email: person.email || null,
      phone: person.phone || null,
    },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "ไม่พบรายชื่อผู้ร่วมประชุม" }, { status: 404 });
  }

  return NextResponse.json(
    await prisma.participantPerson.findUnique({ where: { participantId: ids.participantId } }),
  );
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;

  const values = await params;
  const ids = parseIds(values.groupId, values.participantId);
  if (!ids) return NextResponse.json({ error: "Invalid participant ID" }, { status: 400 });

  const result = await prisma.participantPerson.updateMany({
    where: { ...ids, isActive: true },
    data: { isActive: false },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "ไม่พบรายชื่อผู้ร่วมประชุม" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
