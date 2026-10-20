import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";

/**
 * MVP는 업체 1곳, 관리자 1명. 비밀번호는 환경변수로, 세션은 서명한 쿠키로 둔다.
 */
export const SESSION_COOKIE = "admin_session";
const SESSION_DAYS = 30;

const DEV_PASSWORD = "demo1234";
const DEV_SECRET = "dev-only-secret-change-me";

export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || DEV_PASSWORD;
}

export function isDevPassword(): boolean {
  return !process.env.ADMIN_PASSWORD;
}

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET 환경변수를 설정하세요.");
  }
  return value || DEV_SECRET;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(input: string): boolean {
  return safeEqual(input, adminPassword());
}

export async function startSession(companyId: string): Promise<void> {
  const expires = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
  const payload = `${companyId}.${expires}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSession(): Promise<{ companyId: string } | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [companyId, expires, signature] = raw.split(".");
  if (!companyId || !expires || !signature) return null;
  if (!safeEqual(signature, sign(`${companyId}.${expires}`))) return null;
  // 만료 확인은 현재 시각이 필요하므로 요청 시점에만 실행한다.
  await connection();
  if (Number(expires) < Date.now()) return null;
  return { companyId };
}

/** 모든 관리자 페이지와 서버 액션에서 호출한다. */
export async function requireAdmin(): Promise<{ companyId: string }> {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session;
}
