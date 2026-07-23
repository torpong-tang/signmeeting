import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAuth } from "@/lib/auth";

// GET is intentionally public: the registration page needs it to populate the
// internal-personnel dropdown. Mutations below require an authenticated admin.
export async function GET() {
  const people = await prisma.internalPerson.findMany({
    where: { isActive: true },
    orderBy: [{ fname: "asc" }, { lname: "asc" }],
  });
  const session = await getSession();
  if (session) return NextResponse.json(people);

  return NextResponse.json(
    people.map((person) => ({
      intPid: person.intPid,
      fname: person.fname,
      lname: person.lname,
      department: person.department,
      position: person.position,
    })),
  );
}

export async function POST(request: Request) {
  const denied = await requireAuth();
  if (denied) return denied;
  const body = await request.json();
  const email = String(body.email ?? "").trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid e-mail address" }, { status: 400 });
  }
  const person = await prisma.internalPerson.create({
    data: {
      fname: String(body.fname ?? "").trim(),
      lname: String(body.lname ?? "").trim(),
      department: "",
      position: String(body.position ?? "").trim(),
      email: email || null,
      phone: String(body.phone ?? "").trim() || null,
    },
  });
  return NextResponse.json(person, { status: 201 });
}
