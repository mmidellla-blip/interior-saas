import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BeforeAfter from "@/components/BeforeAfter";
import PageSkeleton from "@/components/PageSkeleton";
import PhotoGallery from "@/components/PhotoGallery";
import { formatDate, daysBetween } from "@/lib/format";
import { getCompanyBySlug, getPortfolioDetail } from "@/lib/queries";
import { PHOTO_KIND_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "시공 사례" };

async function Detail({ params }: { params: Promise<{ slug: string; projectId: string }> }) {
  const { slug, projectId } = await params;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  const detail = await getPortfolioDetail(data.company.id, projectId);
  if (!detail) notFound();
  const { project, photos } = detail;
  const before = photos.find((p) => p.kind === "before");
  const after = photos.find((p) => p.kind === "after");
  const base = `/c/${data.company.slug}`;

  return (
    <article className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <Link href={`${base}#portfolio`} className="text-sm text-muted hover:text-brand">
        ← 시공 사례 목록
      </Link>
      <div className="mt-4 flex flex-wrap gap-1.5">
        <span className="chip bg-surface text-muted">{project.dong}</span>
        <span className="chip bg-surface text-muted">{project.area}평</span>
        <span className="chip bg-surface text-muted">{project.style}</span>
        {project.endDate && (
          <span className="chip bg-surface text-muted">공사 {daysBetween(project.startDate, project.endDate)}일</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{project.title}</h1>
      <p className="mt-3 text-muted">{project.summary}</p>

      {before && after && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-bold">공사 전 · 후</h2>
          <BeforeAfter before={before.src} after={after.src} alt={project.title} />
        </section>
      )}

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold">공사 과정</h2>
        <p className="mb-4 text-sm text-muted">
          {formatDate(project.startDate)} ~ {project.endDate ? formatDate(project.endDate) : "진행 중"} · 현장에서 직접 찍은 사진
        </p>
        <PhotoGallery
          photos={photos.map((p) => ({
            id: p.id,
            src: p.src,
            caption: p.caption,
            label: p.kind === "progress" ? p.stage : PHOTO_KIND_LABEL[p.kind],
          }))}
        />
      </section>

      <section className="card mt-12 flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-bold">우리 집도 이렇게 바꾸고 싶다면</h2>
          <p className="text-sm text-muted">{project.area}평 기준 견적을 바로 확인해 보세요.</p>
        </div>
        <Link href={`${base}/estimate`} className="btn-primary">
          견적 보기
        </Link>
      </section>
    </article>
  );
}

export default function Page({ params }: PageProps<"/c/[slug]/portfolio/[projectId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}
