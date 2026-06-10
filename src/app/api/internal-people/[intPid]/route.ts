import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ intPid: string }> };

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { intPid } = await params;
  const body = await request.json();
  const person = await prisma.internalPerson.update({
    where: { intPid: Number(intPid) },
    data: {
      fname: String(body.fname ?? "").trim(),
      lname: String(body.lname ?? "").trim(),
      department: String(body.department ?? "").trim(),
      position: String(body.position ?? "").trim(),
      isActive: Boolean(body.isActive ?? true),
    },
  });
  return NextResponse.json(person);
}

export async function DELETE(_request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { intPid } = await params;
  await prisma.internalPerson.update({
    where: { intPid: Number(intPid) },
    data: { isActive: false },
  });
  return NextResponse.json({ ok: true });
}
