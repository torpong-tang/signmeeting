import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type Params = { params: Promise<{ intPid: string }> };

export async function PUT(request: Request, { params }: Params) {
  const denied = await requireAuth();
  if (denied) return denied;
  const { intPid } = await params;
  const body = await request.json();
  const email = String(body.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid e-mail address" }, { status: 400 });
  }
  const person = await prisma.internalPerson.update({
    where: { intPid: Number(intPid) },
    data: {
      fname: String(body.fname ?? "").trim(),
      lname: String(body.lname ?? "").trim(),
      position: String(body.position ?? "").trim(),
      email: email || null,
      phone: String(body.phone ?? "").trim() || null,
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
