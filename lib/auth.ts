import { and, eq, gt } from "drizzle-orm";
import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";

export const ADMIN_EMAIL = "hod_etc@pvgcoenashik.org";
export const SESSION_COOKIE = "pvg_session";

const hex = (bytes: Uint8Array) => Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");

export async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" }, key, 256);
  return `${hex(salt)}:${hex(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [saltHex, expected] = stored.split(":");
  if (!saltHex || !expected) return false;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map(x => parseInt(x, 16)));
  const actual = (await hashPassword(password, salt)).split(":")[1];
  if (actual.length !== expected.length) return false;
  let diff = 0; for (let i=0;i<actual.length;i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function hashToken(token: string) {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token))));
}

export function normalizeRecoveryCode(code: string) {
  const compact = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (compact.startsWith("PVG") && compact.length === 15) {
    return `PVG-${compact.slice(3,7)}-${compact.slice(7,11)}-${compact.slice(11,15)}`;
  }
  return code.trim().toUpperCase();
}

export function createRecoveryCode() {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const bytes=crypto.getRandomValues(new Uint8Array(12));
  const raw=Array.from(bytes,b=>chars[b%chars.length]).join("");
  return `PVG-${raw.slice(0,4)}-${raw.slice(4,8)}-${raw.slice(8,12)}`;
}

export function createTemporaryPassword() {
  const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const bytes=crypto.getRandomValues(new Uint8Array(8));
  const raw=Array.from(bytes,b=>chars[b%chars.length]).join("");
  return `AMS-${raw.slice(0,4)}-${raw.slice(4,8)}`;
}

export async function currentUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const [row] = await getDb().select({ id: users.id, name: users.name, email: users.email, department: users.department, role: users.role, status: users.status })
    .from(sessions).innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, await hashToken(token)), gt(sessions.expiresAt, new Date().toISOString()), eq(users.status, "approved"))).limit(1);
  return row ?? null;
}

export async function createSession(userId: number) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const expiresAt = new Date(Date.now() + 7*24*60*60*1000).toISOString();
  await getDb().insert(sessions).values({ userId, tokenHash: await hashToken(token), expiresAt, createdAt: new Date().toISOString() });
  return { token, expiresAt };
}

export function sessionCookie(token: string, expiresAt: string) {
  return { name: SESSION_COOKIE, value: token, httpOnly: true, secure: true, sameSite: "lax" as const, path: "/", expires: new Date(expiresAt) };
}
