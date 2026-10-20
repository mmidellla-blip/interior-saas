"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { publishShowroom } from "@/lib/showroom-actions";
import { MOODS, type Mood, type RoomConfig } from "@/lib/types";
import { readMyShowrooms, saveMyShowroom, type MyShowroom } from "./ShowroomActions";

/**
 * 꾸민 방을 집자랑 미니홈피로 올리는 폼. 내가 올렸던 방을 불러와 고친 거면 그 방을 덮어쓸 수 있다.
 */
export default function ShowroomPublish({ slug, room, fromId }: { slug: string; room: RoomConfig; fromId?: string }) {
  const router = useRouter();
  const [mine, setMine] = useState<MyShowroom | null>(null);
  const [update, setUpdate] = useState(true);
  const [fields, setFields] = useState({ title: "", nickname: "", intro: "", mood: "happy" as Mood, bgm: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const list = readMyShowrooms(slug);
    const target = list.find((m) => m.id === fromId) ?? null;
    // 저장소는 브라우저에만 있어서 마운트 후에 읽는다
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMine(target);
    // 예전에 쓴 닉네임은 새 방에도 채워 준다
    const last = target ?? list[0];
    if (last) {
      setFields({
        title: target?.title ?? "",
        nickname: last.nickname,
        intro: target?.intro ?? "",
        mood: (last.mood in MOODS ? last.mood : "happy") as Mood,
        bgm: last.bgm,
      });
    }
  }, [slug, fromId]);

  const set = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setFields((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const target = update ? mine : null;
    const result = await publishShowroom({ slug, room, ...fields, id: target?.id, token: target?.token });
    if (!result.ok) {
      setError(result.error);
      setPending(false);
      return;
    }
    saveMyShowroom(slug, { id: result.id, token: result.token, ...fields });
    router.push(`/c/${slug}/rooms/${result.id}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <p className="font-bold">미니홈피로 자랑하기</p>
        <p className="text-xs text-muted">링크를 받은 사람 누구나 구경하고 방명록을 남길 수 있어요. 연락처는 올라가지 않아요.</p>
      </div>
      {mine && (
        <label className="flex items-center gap-2 rounded-xl bg-[#fff8e6] p-2.5 text-sm">
          <input type="checkbox" checked={update} onChange={(e) => setUpdate(e.target.checked)} className="h-4 w-4" />
          <span>
            내가 올린 <b>{mine.title}</b>에 덮어쓰기
          </span>
        </label>
      )}
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="sr-title">방 이름</label>
          <input id="sr-title" className="input" value={fields.title} onChange={set("title")} maxLength={40} placeholder="우리 집 거실 🌿" required />
        </div>
        <div>
          <label className="label" htmlFor="sr-nick">닉네임</label>
          <input id="sr-nick" className="input" value={fields.nickname} onChange={set("nickname")} maxLength={20} placeholder="초록이네" required />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sr-intro">한 줄 소개</label>
          <input id="sr-intro" className="input" value={fields.intro} onChange={set("intro")} maxLength={80} placeholder="꿈꾸던 거실 완성!" />
        </div>
        <div>
          <label className="label" htmlFor="sr-mood">오늘의 기분</label>
          <select id="sr-mood" className="input" value={fields.mood} onChange={set("mood")}>
            {(Object.keys(MOODS) as Mood[]).map((m) => (
              <option key={m} value={m}>
                {MOODS[m]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="sr-bgm">BGM</label>
          <input id="sr-bgm" className="input" value={fields.bgm} onChange={set("bgm")} maxLength={40} placeholder="가수 - 곡 제목" />
        </div>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={pending} className="btn-primary w-full py-3 text-base">
        {pending ? "올리는 중…" : mine && update ? "자랑 방 고치기" : "자랑하기"}
      </button>
    </form>
  );
}
