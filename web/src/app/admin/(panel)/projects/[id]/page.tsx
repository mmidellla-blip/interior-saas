import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import CopyButton from "@/components/admin/CopyButton";
import PhotoUploader from "@/components/admin/PhotoUploader";
import ProjectFields from "@/components/admin/ProjectFields";
import SubmitButton from "@/components/admin/SubmitButton";
import PageSkeleton from "@/components/PageSkeleton";
import {
  deletePhoto,
  deleteProject,
  regenerateShareLink,
  setPortfolioPublic,
  updateProject,
} from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { formatDate, formatShortDate } from "@/lib/format";
import { PHOTO_KIND_LABEL, PROJECT_STATUS_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "현장 상세" };

async function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { companyId } = await requireAdmin();
  const { id } = await params;
  const db = await readDb();
  const project = db.projects.find((p) => p.id === id && p.companyId === companyId);
  if (!project) notFound();
  const company = db.companies.find((c) => c.id === companyId)!;
  const photos = db.photos
    .filter((ph) => ph.projectId === project.id && ph.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const sharePath = `/s/${project.shareToken}`;
  const shareMessage = `[${company.name}] ${project.title} 공사 현황입니다. 공정별 사진을 여기서 보실 수 있어요.`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <Link href="/admin/projects" className="text-sm text-muted hover:text-brand">
        ← 현장 목록
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-extrabold">{project.title}</h1>
        <span className="chip bg-wood-soft text-wood">
          {PROJECT_STATUS_LABEL[project.status]}
          {project.currentStage ? ` · ${project.currentStage}` : ""}
        </span>
      </div>
      <p className="text-sm text-muted">
        {project.customerName || "고객 미입력"} · {project.address || project.dong} · {formatDate(project.startDate)} 착공
      </p>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_340px]">
        <div className="space-y-5">
          <PhotoUploader projectId={project.id} defaultStage={project.currentStage} />

          <section className="card p-4 sm:p-5">
            <h2 className="mb-3 font-bold">올린 사진 {photos.length}장</h2>
            {photos.length === 0 ? (
              <p className="text-sm text-muted">아직 사진이 없습니다. 공사 전 사진부터 올려 보세요.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((ph) => (
                  <figure key={ph.id} className="group relative overflow-hidden rounded-xl bg-line">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ph.src} alt={ph.caption} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                    <figcaption className="p-2 text-xs">
                      <span className="font-semibold">
                        {PHOTO_KIND_LABEL[ph.kind]} · {ph.stage}
                      </span>
                      <span className="block truncate text-muted">
                        {formatShortDate(ph.createdAt)} {ph.caption}
                      </span>
                    </figcaption>
                    <form action={deletePhoto} className="absolute top-1.5 right-1.5">
                      <input type="hidden" name="id" value={ph.id} />
                      <button
                        type="submit"
                        className="rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-80 hover:bg-danger hover:opacity-100"
                      >
                        삭제
                      </button>
                    </form>
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card space-y-3 p-4 sm:p-5">
            <h2 className="font-bold">고객 공유 링크</h2>
            <p className="text-xs text-muted">
              고객은 로그인 없이 이 링크로 공정 타임라인을 봅니다. 카톡으로 보내 주세요.
            </p>
            <div className="truncate rounded-lg bg-paper px-3 py-2 font-mono text-xs">{sharePath}</div>
            <div className="grid grid-cols-2 gap-2">
              <CopyButton text={sharePath} label="링크 복사" className="btn-primary" />
              <Link href={sharePath} target="_blank" className="btn-outline">
                미리보기
              </Link>
            </div>
            <CopyButton text={shareMessage + "\n"} label="카톡 안내문 복사" className="btn-outline w-full" />
            <p className="text-xs text-muted">만료: {formatDate(project.shareExpiresAt)}</p>
            <form action={regenerateShareLink}>
              <input type="hidden" name="id" value={project.id} />
              <SubmitButton className="btn-ghost w-full text-xs" pendingText="만드는 중…">
                새 링크 발급 (기존 링크는 더 이상 열리지 않음)
              </SubmitButton>
            </form>
          </section>

          <section className="card space-y-3 p-4 sm:p-5">
            <h2 className="font-bold">포트폴리오</h2>
            {!project.portfolioConsent ? (
              <p className="text-sm text-muted">고객 동의가 체크되어 있지 않아 공개할 수 없습니다. 아래 정보 수정에서 동의를 체크하세요.</p>
            ) : project.status !== "done" ? (
              <p className="text-sm text-muted">완공 상태가 되면 공개됩니다. 공사 중 사진이 그대로 포트폴리오가 돼요.</p>
            ) : null}
            <form action={setPortfolioPublic} className="flex items-center justify-between gap-3">
              <input type="hidden" name="id" value={project.id} />
              <input type="hidden" name="value" value={project.portfolioPublic ? "0" : "1"} />
              <span className="text-sm">
                {project.portfolioPublic ? "✅ 공개 중" : "비공개"}
              </span>
              <SubmitButton
                className={project.portfolioPublic ? "btn-outline" : "btn-primary"}
                pendingText="…"
              >
                {project.portfolioPublic ? "내리기" : "공개하기"}
              </SubmitButton>
            </form>
            {project.portfolioPublic && project.status === "done" && (
              <Link href={`/c/${company.slug}/portfolio/${project.id}`} target="_blank" className="block text-sm text-brand">
                공개 페이지 보기 ↗
              </Link>
            )}
            <p className="text-xs text-muted">공개 페이지에는 동 단위 지역만 표시되고 고객 이름·연락처는 나가지 않습니다.</p>
          </section>
        </div>
      </div>

      <details className="card mt-6 p-4 sm:p-5">
        <summary className="cursor-pointer font-bold">현장 정보 수정</summary>
        <form action={updateProject} className="mt-4 space-y-5">
          <input type="hidden" name="id" value={project.id} />
          <ProjectFields project={project} />
          <SubmitButton className="btn-primary w-full py-3">저장</SubmitButton>
        </form>
        <form action={deleteProject} className="mt-6 border-t border-line pt-4">
          <input type="hidden" name="id" value={project.id} />
          <SubmitButton className="btn-ghost text-danger" pendingText="삭제 중…">
            이 현장과 사진 모두 삭제
          </SubmitButton>
        </form>
      </details>
    </div>
  );
}

export default function Page({ params }: PageProps<"/admin/projects/[id]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProjectDetail params={params} />
    </Suspense>
  );
}
