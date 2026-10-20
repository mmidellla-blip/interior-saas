import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import ShowroomCard from "@/components/ShowroomCard";
import { getCompanyBySlug, getShowrooms } from "@/lib/queries";

export const metadata: Metadata = { title: "집자랑 갤러리" };

const SORTS = [
  ["popular", "인기순"],
  ["new", "최신순"],
] as const;

const KINDS = [
  ["", "전체"],
  ["home", "집"],
  ["shop", "상가"],
] as const;

async function Gallery({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string; kind?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  const sort = query.sort === "new" ? "new" : "popular";
  const kind = query.kind === "home" || query.kind === "shop" ? query.kind : undefined;
  const showrooms = await getShowrooms(data.company.id, { sort, kind });
  const base = `/c/${data.company.slug}`;
  const href = (next: { sort?: string; kind?: string }) => {
    const p = new URLSearchParams();
    const s = next.sort ?? sort;
    const k = next.kind ?? kind ?? "";
    if (s !== "popular") p.set("sort", s);
    if (k) p.set("kind", k);
    const qs = p.toString();
    return `${base}/rooms${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">집자랑 갤러리</h1>
          <p className="mt-1 text-muted">이웃들이 미니룸으로 꾸민 집과 가게를 구경하고, 마음에 들면 따라 꾸며 보세요.</p>
        </div>
        <Link href={`${base}/room`} className="btn-primary px-5 py-3">
          내 방 꾸며서 자랑하기
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-1.5">
        {KINDS.map(([value, label]) => (
          <Link
            key={value}
            href={href({ kind: value })}
            className={`chip px-3 py-1.5 ${(kind ?? "") === value ? "bg-ink text-white" : "bg-surface text-muted"}`}
          >
            {label}
          </Link>
        ))}
        <span className="mx-1 w-px bg-line" />
        {SORTS.map(([value, label]) => (
          <Link
            key={value}
            href={href({ sort: value })}
            className={`chip px-3 py-1.5 ${sort === value ? "bg-ink text-white" : "bg-surface text-muted"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {showrooms.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
          아직 자랑한 방이 없어요. 첫 번째로 자랑해 보세요!
        </p>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {showrooms.map((s) => (
            <ShowroomCard key={s.id} showroom={s} href={`${base}/rooms/${s.id}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Page({ params, searchParams }: PageProps<"/c/[slug]/rooms">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Gallery params={params} searchParams={searchParams} />
    </Suspense>
  );
}
