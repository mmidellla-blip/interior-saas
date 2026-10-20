import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { formatRange } from "@/lib/estimate";
import { formatDateTime } from "@/lib/format";
import { LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, PROJECT_STATUS_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "관리자 홈" };

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

async function Dashboard() {
  const { companyId } = await requireAdmin();
  const db = await readDb();
  const company = db.companies.find((c) => c.id === companyId)!;
  const leads = db.leads
    .filter((l) => l.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const projects = db.projects.filter((p) => p.companyId === companyId);
  const active = projects.filter((p) => p.status !== "done");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const thisMonth = leads.filter((l) => new Date(l.createdAt) >= monthStart);
  const contracted = leads.filter((l) => l.status === "contracted").length;
  const decided = leads.filter((l) => l.status === "contracted" || l.status === "lost").length;
  const newCount = leads.filter((l) => l.status === "new").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 md:py-8">
      <header>
        <p className="text-sm text-muted">{company.name}</p>
        <h1 className="text-2xl font-extrabold">오늘 할 일</h1>
      </header>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="새 문의" value={`${newCount}건`} hint="아직 연락 전" />
        <Stat label="이번 달 문의" value={`${thisMonth.length}건`} />
        <Stat
          label="계약률"
          value={decided ? `${Math.round((contracted / decided) * 100)}%` : "-"}
          hint={`계약 ${contracted} / 결정 ${decided}`}
        />
        <Stat label="진행 중 현장" value={`${active.length}곳`} />
      </div>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">진행 중 현장</h2>
          <Link href="/admin/projects/new" className="text-sm font-semibold text-brand">
            + 새 현장
          </Link>
        </div>
        {active.length === 0 ? (
          <p className="card p-6 text-center text-sm text-muted">진행 중인 현장이 없습니다.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {active.map((p) => {
              const count = db.photos.filter((ph) => ph.projectId === p.id).length;
              return (
                <Link key={p.id} href={`/admin/projects/${p.id}`} className="card flex items-center gap-4 p-4 hover:border-brand">
                  <div className="flex-1">
                    <p className="font-bold">{p.title}</p>
                    <p className="text-xs text-muted">
                      {PROJECT_STATUS_LABEL[p.status]}
                      {p.currentStage ? ` · ${p.currentStage}` : ""} · 사진 {count}장
                    </p>
                  </div>
                  <span className="btn-primary px-3 py-2 text-xs">📷 사진 올리기</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-bold">최근 문의</h2>
          <Link href="/admin/leads" className="text-sm font-semibold text-brand">
            전체 보기
          </Link>
        </div>
        <div className="card divide-y divide-line">
          {leads.slice(0, 5).map((l) => (
            <Link key={l.id} href={`/admin/leads#${l.id}`} className="flex items-center gap-3 p-4 hover:bg-paper">
              <span
                className={`chip ${l.status === "new" ? "bg-danger text-white" : "bg-paper text-muted"}`}
              >
                {LEAD_STATUS_LABEL[l.status]}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {l.name} · {l.dong || "지역 미입력"} · {l.area}평
                </p>
                <p className="text-xs text-muted">
                  {LEAD_SOURCE_LABEL[l.source]} · {formatDateTime(l.createdAt)}
                </p>
              </div>
              <span className="hidden text-sm font-semibold sm:block">{formatRange(l.estimate)}</span>
            </Link>
          ))}
          {leads.length === 0 && <p className="p-6 text-center text-sm text-muted">아직 문의가 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}
