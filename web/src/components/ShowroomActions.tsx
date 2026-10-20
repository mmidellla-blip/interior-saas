"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { deleteMyShowroom, recordVisit, toggleLike, writeGuestbook, type GuestbookState } from "@/lib/showroom-actions";

/** 내가 올린 방의 수정 토큰은 이 브라우저에만 남긴다 */
export interface MyShowroom {
  id: string;
  token: string;
  title: string;
  nickname: string;
  intro: string;
  mood: string;
  bgm: string;
}

const myShowroomsKey = (slug: string) => `my-showrooms:${slug}`;

export function readMyShowrooms(slug: string): MyShowroom[] {
  try {
    const list = JSON.parse(localStorage.getItem(myShowroomsKey(slug)) ?? "[]");
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveMyShowroom(slug: string, item: MyShowroom | { id: string; remove: true }) {
  try {
    const list = readMyShowrooms(slug).filter((m) => m.id !== item.id);
    if (!("remove" in item)) list.unshift(item);
    localStorage.setItem(myShowroomsKey(slug), JSON.stringify(list.slice(0, 20)));
  } catch {
    // 저장소를 못 쓰면 다음에 고칠 수 없을 뿐
  }
}

/** TODAY / TOTAL. 같은 탭에서 새로고침해도 한 번만 센다 */
export function VisitCounter({ id, today, total }: { id: string; today: number; total: number }) {
  const [counts, setCounts] = useState({ today, total });
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const key = `visited:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 저장소를 못 쓰면 그냥 센다
    }
    recordVisit(id).then((next) => next && setCounts(next));
  }, [id]);
  return (
    <p className="flex items-center justify-center gap-2 text-[11px] font-bold tracking-wide text-muted">
      TODAY <span className="text-[#e0566b] tabular-nums">{counts.today}</span>
      <span className="text-line">|</span>
      TOTAL <span className="tabular-nums text-ink">{counts.total}</span>
    </p>
  );
}

export function LikeButton({ id, likes, liked }: { id: string; likes: number; liked: boolean }) {
  const [state, setState] = useState({ likes, liked });
  const [pending, setPending] = useState(false);
  async function onClick() {
    setPending(true);
    const next = await toggleLike(id);
    if (next) setState(next);
    setPending(false);
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={state.liked}
      className={`rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
        state.liked ? "border-[#e0566b] bg-[#e0566b] text-white" : "border-[#f2b8c1] bg-white text-[#e0566b] hover:bg-[#fff0f2]"
      }`}
    >
      ♥ 공감 <span className="tabular-nums">{state.likes}</span>
    </button>
  );
}

/** 미니룸 SVG를 PNG로 저장 */
async function saveSvgAsPng(container: HTMLElement | null, filename: string) {
  const svg = container?.querySelector("svg");
  if (!svg) return;
  const [, , vw, vh] = (svg.getAttribute("viewBox") ?? "0 0 800 600").split(" ").map(Number);
  const width = 1600;
  const height = Math.round((width * vh) / vw);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#f1ebe1";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const link = document.createElement("a");
    link.download = filename;
    link.href = canvas.toDataURL("image/png");
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function ShareTools({ title, sceneId }: { title: string; sceneId: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${title} — 미니룸 구경 오세요!`, url });
        return;
      } catch {
        // 공유 창을 닫으면 링크 복사로
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <>
      <button type="button" onClick={share} className="btn-outline px-4 py-2 text-sm">
        {copied ? "링크 복사됨 ✓" : "공유하기"}
      </button>
      <button
        type="button"
        onClick={() => saveSvgAsPng(document.getElementById(sceneId), `${title}.png`)}
        className="btn-outline px-4 py-2 text-sm"
      >
        이미지 저장
      </button>
    </>
  );
}

/** 만든 사람에게만 보이는 수정·내리기 */
export function OwnerTools({ slug, id }: { slug: string; id: string }) {
  const router = useRouter();
  const [mine, setMine] = useState<MyShowroom | null>(null);
  useEffect(() => {
    // 저장소는 브라우저에만 있어서 마운트 후에 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMine(readMyShowrooms(slug).find((m) => m.id === id) ?? null);
  }, [slug, id]);
  if (!mine) return null;

  async function remove() {
    if (!mine || !window.confirm("이 자랑 방을 내릴까요? 방명록도 함께 사라져요.")) return;
    if (await deleteMyShowroom(mine.id, mine.token)) {
      saveMyShowroom(slug, { id: mine.id, remove: true });
      router.push(`/c/${slug}/rooms`);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#fff8e6] px-3 py-2 text-xs">
      <span className="font-semibold text-[#9a6b00]">내가 만든 방이에요</span>
      <span className="flex-1" />
      <Link href={`/c/${slug}/room?from=${id}`} className="rounded-full bg-white px-3 py-1.5 font-semibold shadow-sm">
        다시 꾸미기
      </Link>
      <button type="button" onClick={remove} className="rounded-full px-3 py-1.5 font-semibold text-red-700 hover:bg-red-50">
        내리기
      </button>
    </div>
  );
}

export function GuestbookForm({ id }: { id: string }) {
  const [state, action, pending] = useActionState<GuestbookState, FormData>(writeGuestbook, { ok: false });
  // React가 제출 뒤 폼을 비워 준다
  return (
    <form action={action} className="space-y-2 rounded-xl bg-[#f3f7fa] p-3">
      <input type="hidden" name="id" value={id} />
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="flex gap-2">
        <input name="nickname" className="input w-32 shrink-0 bg-white py-2 text-sm" placeholder="닉네임" maxLength={20} required />
        <textarea
          name="message"
          className="input min-h-[42px] flex-1 resize-y bg-white py-2 text-sm"
          placeholder="방명록을 남겨 주세요 (300자)"
          maxLength={300}
          rows={1}
          required
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-danger" aria-live="polite">
          {state.error}
        </p>
        <button type="submit" disabled={pending} className="btn-primary px-4 py-1.5 text-sm">
          {pending ? "남기는 중…" : "남기기"}
        </button>
      </div>
    </form>
  );
}
