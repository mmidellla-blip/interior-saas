import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import AutoSubmitSelect from "@/components/admin/AutoSubmitSelect";
import SubmitButton from "@/components/admin/SubmitButton";
import PageSkeleton from "@/components/PageSkeleton";
import RoomScene from "@/components/RoomScene";
import { updateLead } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { formatRange, formatWon } from "@/lib/estimate";
import { formatDateTime } from "@/lib/format";
import { describeRoom } from "@/lib/room";
import { GRADE_LABEL, LEAD_SOURCE_LABEL, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/types";

export const metadata: Metadata = { title: "문의 관리" };

const STATUS_OPTIONS = (Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]).map((value) => ({
  value,
  label: LEAD_STATUS_LABEL[value],
}));

async function Leads({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { companyId } = await requireAdmin();
  const { status } = await searchParams;
  const db = await readDb();
  const all = db.leads
    .filter((l) => l.companyId === companyId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const leads = status ? all.filter((l) => l.status === status) : all;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:py-8">
      <h1 className="text-2xl font-extrabold">문의</h1>
      <p className="text-sm text-muted">견적 계산기·미니룸·블로그 위젯으로 들어온 상담 요청</p>

      <div className="mt-4 flex gap-1.5 overflow-x-auto pb-1">
        <Link href="/admin/leads" className={`chip shrink-0 px-3 py-1.5 ${!status ? "bg-ink text-white" : "bg-surface text-muted"}`}>
          전체 {all.length}
        </Link>
        {STATUS_OPTIONS.map((o) => (
          <Link
            key={o.value}
            href={`/admin/leads?status=${o.value}`}
            className={`chip shrink-0 px-3 py-1.5 ${status === o.value ? "bg-ink text-white" : "bg-surface text-muted"}`}
          >
            {o.label} {all.filter((l) => l.status === o.value).length}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {leads.length === 0 && <p className="card p-8 text-center text-sm text-muted">해당하는 문의가 없습니다.</p>}
        {leads.map((lead) => (
          <article key={lead.id} id={lead.id} className="card scroll-mt-6 overflow-hidden">
            <div className="flex flex-wrap items-start gap-4 p-4">
              {lead.room && (
                <div className="w-full shrink-0 rounded-xl bg-[#f1ebe1] p-2 sm:w-44">
                  <RoomScene room={lead.room} className="w-full" />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold">{lead.name}</h2>
                  <a href={`tel:${lead.phone}`} className="text-sm font-semibold text-brand">
                    {lead.phone}
                  </a>
                </div>
                <p className="text-sm text-muted">
                  {lead.dong || "지역 미입력"} · {lead.area}평
                  {lead.moveIn ? ` · 희망 ${lead.moveIn}` : ""} · {LEAD_SOURCE_LABEL[lead.source]} ·{" "}
                  {formatDateTime(lead.createdAt)}
                </p>
                <p className="text-lg font-extrabold">{formatRange(lead.estimate)}</p>
                {lead.room && <p className="text-xs text-muted">{describeRoom(lead.room)}</p>}
                {!lead.room && lead.estimate.lines.length > 0 && (
                  <p className="text-xs text-muted">
                    {GRADE_LABEL[lead.estimate.lines[0].grade]} ·{" "}
                    {lead.estimate.lines.map((l) => `${l.name} ${formatWon(l.amount)}`).join(", ")}
                  </p>
                )}
                {lead.message && <p className="mt-2 rounded-lg bg-paper p-2.5 text-sm">“{lead.message}”</p>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 p-3">
              <form action={updateLead}>
                <input type="hidden" name="id" value={lead.id} />
                <AutoSubmitSelect name="status" defaultValue={lead.status} options={STATUS_OPTIONS} />
              </form>
              <form action={updateLead} className="flex min-w-0 flex-1 gap-2">
                <input type="hidden" name="id" value={lead.id} />
                <input name="memo" defaultValue={lead.memo} placeholder="메모 (실측 일정, 통화 내용…)" className="input min-w-0 flex-1 py-1.5" />
                <SubmitButton className="btn-outline py-1.5" pendingText="…">
                  저장
                </SubmitButton>
              </form>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function Page({ searchParams }: PageProps<"/admin/leads">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Leads searchParams={searchParams as Promise<{ status?: string }>} />
    </Suspense>
  );
}
