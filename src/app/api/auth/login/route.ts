import { NextResponse } from "next/server";
import { setSessionCookie, verifyCredentials } from "@/lib/auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { username?: unknown; password?: unknown };
  const username = String(body.username ?? "");
  const password = String(body.password ?? "");

  if (!verifyCredentials(username, password)) {
    return NextResponse.json({ message: "Username หรือ Password ไม่ถูกต้อง" }, { status: 401 });
  }

  await setSessionCookie(username);
  return NextResponse.json({ authenticated: true, username });
}
