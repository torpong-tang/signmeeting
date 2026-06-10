import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET is intentionally public: the registration page needs it to populate the
// internal-personnel dropdown. Mutations below require an authenticated admin.
export async function GET() {
  const people = await prisma.internalPerson.findMany({
    where: { isActive: true },
    orderBy: [{ fname: "asc" }, { lname: "asc" }],
  });
  return NextResponse.json(people);
}

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const body = await request.json();
  const person = await prisma.internalPerson.create({
    data: {
      fname: String(body.fname ?? "").trim(),
      lname: String(body.lname ?? "").trim(),
      department: String(body.department ?? "").trim(),
      position: String(body.position ?? "").trim(),
    },
  });
  return NextResponse.json(person, { status: 201 });
}
