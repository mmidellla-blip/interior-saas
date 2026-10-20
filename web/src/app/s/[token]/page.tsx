import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import PhotoGallery from "@/components/PhotoGallery";
import PoweredBy from "@/components/PoweredBy";
import { dayKey, formatDate, formatShortDate } from "@/lib/format";
import { getSharedProject } from "@/lib/queries";
import { PHOTO_KIND_LABEL, PROJECT_STATUS_LABEL, STAGES, type Photo } from "@/lib/types";

export const metadata: Metadata = {
  title: "우리 집 공사 현황",
  // 공유 링크는 검색에 노출되지 않게
  robots: { index: false, follow: false },
};

async function Shared({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await getSharedProject(token);
  if (!data) notFound();
  if (data.expired) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold">링크 기간이 끝났습니다</h1>
        <p className="mt-2 text-muted">업체에 새 링크를 요청해 주세요.</p>
      </div>
    );
  }
  const { company, project, photos } = data;

  const doneStages = new Set(photos.filter((p) => p.kind !== "before").map((p) => p.stage));
  const currentIndex = project.currentStage ? STAGES.indexOf(project.currentStage) : -1;

  const byDay = new Map<string, Photo[]>();
  for (const photo of [...photos].reverse()) {
    const key = dayKey(photo.createdAt);
    byDay.set(key, [...(byDay.get(key) ?? []), photo]);
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16">
      <header className="py-6">
        <p className="text-sm font-semibold text-brand">{company.name}</p>
        <h1 className="mt-1 text-2xl font-extrabold">{project.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {project.dong} · {project.area}평 · {formatDate(project.startDate)} 착공
        </p>
        <span
          className={`chip mt-3 ${project.status === "done" ? "bg-brand text-white" : "bg-wood-soft text-wood"}`}
        >
          {PROJECT_STATUS_LABEL[project.status]}
          {project.status === "in_progress" && project.currentStage ? ` · 지금 ${project.currentStage} 단계` : ""}
        </span>
      </header>

      <section className="card p-4">
        <h2 className="mb-3 text-sm font-bold text-muted">공정 진행</h2>
        <ol className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {STAGES.map((stage, i) => {
            const done = project.status === "done" || i < currentIndex || (doneStages.has(stage) && i !== currentIndex);
            const current = project.status !== "done" && i === currentIndex;
            return (
              <li
                key={stage}
                className={`rounded-lg px-2 py-2 text-center text-xs font-semibold ${
                  current
                    ? "bg-wood text-white ring-2 ring-wood/30"
                    : done
                      ? "bg-brand-soft text-brand"
                      : "bg-paper text-muted"
                }`}
              >
                {done && !current ? "✓ " : ""}
                {stage}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="mb-4 text-lg font-bold">현장 사진 타임라인</h2>
        {photos.length === 0 && (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
            공사가 시작되면 사진이 여기에 올라옵니다.
          </p>
        )}
        <ol className="relative space-y-8 border-l-2 border-line pl-5">
          {[...byDay.entries()].map(([day, list]) => (
            <li key={day} className="relative">
              <span className="absolute top-1 -left-[27px] h-3 w-3 rounded-full border-2 border-paper bg-brand" />
              <p className="text-sm font-bold">{formatShortDate(list[0].createdAt)}</p>
              <ul className="mb-3 text-sm text-muted">
                {list.map((p) => (
                  <li key={p.id}>
                    <span className="font-semibold text-ink">
                      {p.kind === "progress" ? p.stage : PHOTO_KIND_LABEL[p.kind]}
                    </span>{" "}
                    {p.caption}
                  </li>
                ))}
              </ul>
              <PhotoGallery
                columns={2}
                photos={list.map((p) => ({ id: p.id, src: p.src, caption: p.caption, label: p.stage }))}
              />
            </li>
          ))}
        </ol>
      </section>

      <section className="card mt-10 p-5 text-center">
        <p className="text-sm text-muted">궁금한 점은 언제든 연락 주세요</p>
        <a href={`tel:${company.phone}`} className="btn-primary mt-3">
          {company.name} {company.phone}
        </a>
      </section>
      <div className="mt-8 text-center">
        <PoweredBy />
      </div>
    </div>
  );
}

export default function Page({ params }: PageProps<"/s/[token]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Shared params={params} />
    </Suspense>
  );
}
