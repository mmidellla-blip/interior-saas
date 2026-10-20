import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import RoomScene, { FurnitureThumb } from "@/components/RoomScene";
import { GuestbookForm, LikeButton, OwnerTools, ShareTools, VisitCounter } from "@/components/ShowroomActions";
import ShowroomViewer from "@/components/ShowroomViewer";
import { formatDate, formatDateTime } from "@/lib/format";
import { getCompanyBySlug, getShowroom, isLiked } from "@/lib/queries";
import { findLayout, LAYOUT_KIND_LABEL } from "@/lib/room";
import { MOODS } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/c/[slug]/rooms/[id]">): Promise<Metadata> {
  const { slug, id } = await params;
  const data = await getCompanyBySlug(slug);
  const showroom = data && (await getShowroom(data.company.id, id));
  return showroom
    ? { title: `${showroom.title} — ${showroom.nickname}님의 미니룸`, description: showroom.intro || "미니룸 구경 오세요!" }
    : { title: "미니룸을 찾을 수 없습니다" };
}

/**
 * 집자랑 미니홈피. 왼쪽은 프로필(방문자·기분·BGM), 오른쪽은 미니룸과 방명록.
 */
async function Minihompy({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  const showroom = await getShowroom(data.company.id, id);
  if (!showroom) notFound();
  const { company } = data;
  const base = `/c/${company.slug}`;
  const layout = findLayout(showroom.room.layout);
  const [moodEmoji, moodLabel] = MOODS[showroom.mood].split(" ");
  const liked = await isLiked(showroom.id);

  return (
    <div className="bg-[#e6edf2] bg-[radial-gradient(#cfdbe4_1px,transparent_1px)] [background-size:14px_14px] py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-3 sm:px-4">
        <div className="rounded-[28px] bg-[#7fa3bf] p-2 shadow-lg sm:p-3">
          <div className="grid gap-2 rounded-[22px] bg-[#dbe6ee] p-2 sm:gap-3 sm:p-3 md:grid-cols-[230px_1fr]">
            {/* 프로필 */}
            <aside className="space-y-3 rounded-2xl border border-dashed border-[#a9c1d3] bg-white p-4">
              <VisitCounter id={showroom.id} today={showroom.visitsToday} total={showroom.visitsTotal} />
              <div className="grid place-items-center rounded-xl bg-gradient-to-b from-[#fdf6e9] to-[#f3e7d3] py-3">
                <FurnitureThumb type="minime" room={showroom.room} className="h-24 w-24" />
              </div>
              <div>
                <p className="text-lg font-extrabold">{showroom.nickname}</p>
                {showroom.intro && <p className="mt-1 text-sm leading-relaxed text-muted">{showroom.intro}</p>}
              </div>
              <dl className="space-y-1.5 border-t border-dashed border-line pt-3 text-xs">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-semibold text-muted">오늘의 기분</dt>
                  <dd>
                    {moodEmoji} {moodLabel}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-semibold text-muted">구조</dt>
                  <dd>
                    {LAYOUT_KIND_LABEL[layout.kind]} · {layout.label}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0 font-semibold text-muted">꾸민 날</dt>
                  <dd>{formatDate(showroom.updatedAt)}</dd>
                </div>
              </dl>
              {showroom.bgm && (
                <div className="overflow-hidden rounded-lg bg-[#2b3a47] px-3 py-2 text-xs text-white">
                  <p className="animate-[marquee_12s_linear_infinite] whitespace-nowrap">♪ {showroom.bgm}</p>
                </div>
              )}
            </aside>

            {/* 미니룸 + 방명록 */}
            <main className="min-w-0 space-y-4 rounded-2xl border border-dashed border-[#a9c1d3] bg-white p-4 sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <h1 className="text-xl font-extrabold sm:text-2xl">{showroom.title}</h1>
                <Link href={`${base}/rooms`} className="text-xs font-semibold text-muted hover:text-brand">
                  다른 집 구경하기 →
                </Link>
              </div>

              <OwnerTools slug={company.slug} id={showroom.id} />

              <ShowroomViewer id="showroom-scene" room={showroom.room}>
                <RoomScene room={showroom.room} className="mx-auto w-full max-w-[620px] drop-shadow-sm" />
              </ShowroomViewer>

              <div className="flex flex-wrap gap-2">
                <LikeButton id={showroom.id} likes={showroom.likes} liked={liked} />
                <ShareTools title={showroom.title} sceneId="showroom-scene" />
                <Link href={`${base}/room?from=${showroom.id}`} className="btn-outline px-4 py-2 text-sm">
                  이 방 따라 꾸미기
                </Link>
              </div>

              <section className="border-t border-dashed border-line pt-4">
                <h2 className="mb-2 text-sm font-bold">
                  방명록 <span className="font-normal text-muted">{showroom.guestbook.length}</span>
                </h2>
                <GuestbookForm id={showroom.id} />
                <ul className="mt-3 space-y-2">
                  {showroom.guestbook.map((entry) => (
                    <li key={entry.id} className="rounded-xl border border-line p-3">
                      <p className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold">{entry.nickname}</span>
                        <span className="text-muted">{formatDateTime(entry.createdAt)}</span>
                      </p>
                      <p className="mt-1 text-sm break-words whitespace-pre-line">{entry.message}</p>
                    </li>
                  ))}
                  {showroom.guestbook.length === 0 && (
                    <li className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">
                      첫 방명록을 남겨 주세요!
                    </li>
                  )}
                </ul>
              </section>
            </main>
          </div>
        </div>

        <div className="card mt-5 flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-bold">이 방, 진짜로 만들 수 있어요</p>
            <p className="text-sm text-muted">
              {company.name}에서 같은 마감재로 견적을 바로 보고 상담받을 수 있어요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`${base}/room?from=${showroom.id}`} className="btn-primary">
              이 구성으로 견적 보기
            </Link>
            <Link href={`${base}/room`} className="btn-outline">
              나도 꾸며서 자랑하기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Page({ params }: PageProps<"/c/[slug]/rooms/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Minihompy params={params} />
    </Suspense>
  );
}
