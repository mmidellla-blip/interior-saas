"use server";

import { timingSafeEqual } from "node:crypto";
import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { mutateDb, newId, newShareToken } from "./db";
import { dayKey } from "./format";
import { LIKED_COOKIE } from "./queries";
import { normalizeRoom } from "./room";
import { MOODS, type Mood, type Showroom } from "./types";

/**
 * 집자랑(미니홈피) 공개 액션. 로그인 없이 쓰므로 길이를 자르고, 수정은 만든 사람이 받은 토큰으로만 한다.
 */
const MAX_SHOWROOMS = 2000;
const MAX_GUESTBOOK = 300;

/** 줄바꿈·제어 문자를 지우고 길이를 자른다 */
function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .trim()
    .slice(0, max);
}

function sameToken(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export interface PublishInput {
  slug: string;
  room: unknown;
  title: string;
  nickname: string;
  intro: string;
  mood: string;
  bgm: string;
  /** 이미 올린 방을 고칠 때 */
  id?: string;
  token?: string;
}

export type PublishResult = { ok: true; id: string; token: string } | { ok: false; error: string };

export async function publishShowroom(input: PublishInput): Promise<PublishResult> {
  const title = clean(input.title, 40);
  const nickname = clean(input.nickname, 20);
  if (!title) return { ok: false, error: "방 이름을 지어 주세요." };
  if (!nickname) return { ok: false, error: "닉네임을 적어 주세요." };
  const fields = {
    title,
    nickname,
    intro: clean(input.intro, 80),
    mood: (input.mood in MOODS ? input.mood : "happy") as Mood,
    bgm: clean(input.bgm, 40),
    room: normalizeRoom(input.room),
  };
  const slug = clean(input.slug, 60);

  return mutateDb((db): PublishResult => {
    const company = db.companies.find((c) => c.slug === slug);
    if (!company) return { ok: false, error: "업체 정보를 찾을 수 없습니다." };
    const now = new Date().toISOString();

    const mine = db.showrooms.find(
      (s) => s.id === input.id && s.companyId === company.id && sameToken(s.editToken, String(input.token ?? "")),
    );
    if (mine) {
      Object.assign(mine, fields, { updatedAt: now });
      return { ok: true, id: mine.id, token: mine.editToken };
    }

    if (db.showrooms.filter((s) => s.companyId === company.id).length >= MAX_SHOWROOMS) {
      return { ok: false, error: "지금은 자랑 방을 더 만들 수 없어요. 업체에 문의해 주세요." };
    }
    const showroom: Showroom = {
      id: newId("show"),
      companyId: company.id,
      createdAt: now,
      updatedAt: now,
      ...fields,
      editToken: newShareToken(),
      likes: 0,
      visitsTotal: 0,
      visitsToday: 0,
      visitsDate: dayKey(now),
      hidden: false,
      guestbook: [],
    };
    db.showrooms.push(showroom);
    return { ok: true, id: showroom.id, token: showroom.editToken };
  });
}

/** 만든 사람이 자기 방을 내린다 */
export async function deleteMyShowroom(id: string, token: string): Promise<boolean> {
  return mutateDb((db) => {
    const index = db.showrooms.findIndex((s) => s.id === id && sameToken(s.editToken, String(token)));
    if (index < 0) return false;
    db.showrooms.splice(index, 1);
    return true;
  });
}

/** 공감(좋아요) 켜고 끄기. 같은 브라우저에서 두 번 눌러지지 않게 쿠키로 기억한다 */
export async function toggleLike(id: string): Promise<{ likes: number; liked: boolean } | null> {
  const store = await cookies();
  const liked = new Set((store.get(LIKED_COOKIE)?.value ?? "").split(".").filter(Boolean));
  const wasLiked = liked.has(id);
  const likes = await mutateDb((db) => {
    const showroom = db.showrooms.find((s) => s.id === id && !s.hidden);
    if (!showroom) return null;
    showroom.likes = Math.max(0, showroom.likes + (wasLiked ? -1 : 1));
    return showroom.likes;
  });
  if (likes === null) return null;
  if (wasLiked) liked.delete(id);
  else liked.add(id);
  store.set(LIKED_COOKIE, [...liked].slice(-100).join("."), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { likes, liked: !wasLiked };
}

/** 방문자 수. 같은 탭에서 여러 번 세지 않는 건 화면 쪽에서 막는다 */
export async function recordVisit(id: string): Promise<{ today: number; total: number } | null> {
  return mutateDb((db) => {
    const showroom = db.showrooms.find((s) => s.id === id && !s.hidden);
    if (!showroom) return null;
    const today = dayKey(new Date().toISOString());
    if (showroom.visitsDate !== today) {
      showroom.visitsDate = today;
      showroom.visitsToday = 0;
    }
    showroom.visitsToday++;
    showroom.visitsTotal++;
    return { today: showroom.visitsToday, total: showroom.visitsTotal };
  });
}

export interface GuestbookState {
  ok: boolean;
  error?: string;
}

export async function writeGuestbook(_prev: GuestbookState, form: FormData): Promise<GuestbookState> {
  // 사람 눈에 안 보이는 칸이 채워져 있으면 스팸 봇
  if (clean(form.get("website"), 100)) return { ok: true };
  const id = clean(form.get("id"), 40);
  const nickname = clean(form.get("nickname"), 20);
  const message = clean(form.get("message"), 300);
  if (!nickname) return { ok: false, error: "닉네임을 적어 주세요." };
  if (!message) return { ok: false, error: "남길 말을 적어 주세요." };

  const saved = await mutateDb((db) => {
    const showroom = db.showrooms.find((s) => s.id === id && !s.hidden);
    if (!showroom) return false;
    showroom.guestbook.push({ id: newId("gb"), nickname, message, createdAt: new Date().toISOString() });
    if (showroom.guestbook.length > MAX_GUESTBOOK) showroom.guestbook.splice(0, showroom.guestbook.length - MAX_GUESTBOOK);
    return true;
  });
  if (!saved) return { ok: false, error: "방을 찾을 수 없어요." };
  refresh();
  return { ok: true };
}
