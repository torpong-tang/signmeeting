import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

// Signed, httpOnly session cookie. Replaces the old client-side localStorage
// "admin" flag, which gave no real protection — every /api/* route was open.
const COOKIE_NAME = "sm_session";
const MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

function authSecret() {
  return process.env.AUTH_SECRET || "dev-insecure-secret-change-me";
}

function adminUsername() {
  return process.env.ADMIN_USERNAME || "admin";
}

function adminPassword() {
  return process.env.ADMIN_PASSWORD || "signmeeting";
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function sign(body: string) {
  return createHmac("sha256", authSecret()).update(body).digest("base64url");
}

export function verifyCredentials(username: string, password: string) {
  // Compare both fields with constant-time equality to avoid leaking which one
  // was wrong via timing.
  const userOk = safeEqual(username, adminUsername());
  const passOk = safeEqual(password, adminPassword());
  return userOk && passOk;
}

export function createSessionToken(username: string) {
  const payload = JSON.stringify({ u: username, exp: Date.now() + MAX_AGE_SECONDS * 1000 });
  const body = Buffer.from(payload).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token: string | undefined): { u: string } | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature || !safeEqual(signature, sign(body))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { u?: unknown; exp?: unknown };
    if (typeof payload.u !== "string" || typeof payload.exp !== "number") return null;
    if (Date.now() > payload.exp) return null;
    return { u: payload.u };
  } catch {
    return null;
  }
}

export async function getSession() {
  const store = await cookies();
  return verifySessionToken(store.get(COOKIE_NAME)?.value);
}

// Returns a 401 response when the caller is not an authenticated admin, or null
// when the request may proceed. Use at the top of protected route handlers.
export async function requireAuth(): Promise<NextResponse | null> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function setSessionCookie(username: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(username), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
