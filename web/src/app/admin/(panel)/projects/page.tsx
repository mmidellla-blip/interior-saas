import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PROJECT_STATUS_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "현장 관리" };

async function Projects() {
  const { companyId } = await requireAdmin();
  const db = await readDb();
  const order = { in_progress: 0, planned: 1, done: 2 };
  const projects = db.projects
    .filter((p) => p.companyId === companyId)
    .sort((a, b) => order[a.status] - order[b.status] || b.startDate.localeCompare(a.startDate));

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">현장</h1>
          <p className="text-sm text-muted">사진을 올리면 공유 페이지와 포트폴리오가 함께 채워집니다</p>
        </div>
        <Link href="/admin/projects/new" className="btn-primary">
          + 새 현장
        </Link>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {projects.map((p) => {
          const photos = db.photos.filter((ph) => ph.projectId === p.id);
          const cover = photos.findLast((ph) => ph.kind === "after") ?? photos.at(-1);
          return (
            <Link key={p.id} href={`/admin/projects/${p.id}`} className="card overflow-hidden hover:border-brand">
              <div className="aspect-[16/9] bg-line">
                {cover && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={cover.src} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5">
                  <span className={`chip ${p.status === "in_progress" ? "bg-wood text-white" : "bg-paper text-muted"}`}>
                    {PROJECT_STATUS_LABEL[p.status]}
                    {p.status === "in_progress" && p.currentStage ? ` · ${p.currentStage}` : ""}
                  </span>
                  {p.portfolioPublic && <span className="chip bg-brand-soft text-brand">포트폴리오 공개</span>}
                </div>
                <p className="mt-2 font-bold">{p.title}</p>
                <p className="text-xs text-muted">
                  {p.customerName || "고객 미입력"} · {formatDate(p.startDate)} 착공 · 사진 {photos.length}장
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Projects />
    </Suspense>
  );
}
