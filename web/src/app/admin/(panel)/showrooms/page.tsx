import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import SubmitButton from "@/components/admin/SubmitButton";
import PageSkeleton from "@/components/PageSkeleton";
import RoomScene from "@/components/RoomScene";
import { deleteGuestbookEntry, deleteShowroom, setShowroomHidden } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { findLayout, LAYOUT_KIND_LABEL } from "@/lib/room";

export const metadata: Metadata = { title: "집자랑 관리" };

async function Showrooms() {
  const { companyId } = await requireAdmin();
  const db = await readDb();
  const company = db.companies.find((c) => c.id === companyId);
  const showrooms = db.showrooms
    .filter((s) => s.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <h1 className="text-2xl font-extrabold">집자랑</h1>
      <p className="text-sm text-muted">
        손님이 미니룸을 꾸며 공개한 미니홈피입니다. 부적절한 방은 숨기고, 방명록은 한 줄씩 지울 수 있어요.
      </p>

      <div className="mt-4 space-y-3">
        {showrooms.length === 0 && <p className="card p-8 text-center text-sm text-muted">아직 올라온 방이 없습니다.</p>}
        {showrooms.map((s) => {
          const layout = findLayout(s.room.layout);
          return (
            <article key={s.id} className={`card overflow-hidden ${s.hidden ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-start gap-4 p-4">
                <div className="w-full shrink-0 rounded-xl bg-[#f1ebe1] p-2 sm:w-44">
                  <RoomScene room={s.room} className="w-full" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold">{s.title}</h2>
                    {s.hidden && <span className="chip bg-danger/10 text-danger">숨김</span>}
                  </div>
                  <p className="text-sm text-muted">
                    {s.nickname} · {LAYOUT_KIND_LABEL[layout.kind]} {layout.label} · {formatDateTime(s.createdAt)}
                  </p>
                  {s.intro && <p className="text-sm">{s.intro}</p>}
                  <p className="text-xs font-semibold text-muted tabular-nums">
                    ♥ {s.likes} · 방문 {s.visitsTotal} · 방명록 {s.guestbook.length}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    {company && !s.hidden && (
                      <Link href={`/c/${company.slug}/rooms/${s.id}`} target="_blank" className="btn-outline px-3 py-1.5 text-sm">
                        보기
                      </Link>
                    )}
                    <form action={setShowroomHidden}>
                      <input type="hidden" name="id" value={s.id} />
                      <input type="hidden" name="hidden" value={String(!s.hidden)} />
                      <SubmitButton className="btn-outline px-3 py-1.5 text-sm">{s.hidden ? "다시 공개" : "숨기기"}</SubmitButton>
                    </form>
                    <form action={deleteShowroom}>
                      <input type="hidden" name="id" value={s.id} />
                      <SubmitButton className="btn-ghost px-3 py-1.5 text-sm text-danger">삭제</SubmitButton>
                    </form>
                  </div>
                </div>
              </div>
              {s.guestbook.length > 0 && (
                <details className="border-t border-line px-4 py-3 text-sm">
                  <summary className="cursor-pointer font-semibold">방명록 {s.guestbook.length}개</summary>
                  <ul className="mt-2 divide-y divide-line">
                    {[...s.guestbook].reverse().map((g) => (
                      <li key={g.id} className="flex items-start gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted">
                            <b className="text-ink">{g.nickname}</b> · {formatDateTime(g.createdAt)}
                          </p>
                          <p className="break-words">{g.message}</p>
                        </div>
                        <form action={deleteGuestbookEntry}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="entryId" value={g.id} />
                          <SubmitButton className="btn-ghost px-2 py-1 text-xs text-danger">지우기</SubmitButton>
                        </form>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Showrooms />
    </Suspense>
  );
}
