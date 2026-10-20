"use client";

import { useActionState } from "react";
import { submitLead, type LeadFormState } from "@/lib/public-actions";

/**
 * 견적을 본 뒤 연락처를 남기는 폼. hidden 필드로 견적 조건을 함께 보낸다.
 */
export default function LeadForm({
  slug,
  companyName,
  hidden,
  compact = false,
}: {
  slug: string;
  companyName: string;
  hidden: Record<string, string>;
  compact?: boolean;
}) {
  const [state, action, pending] = useActionState<LeadFormState, FormData>(submitLead, { ok: false });

  if (state.ok) {
    return (
      <div className="rounded-2xl bg-brand-soft p-5 text-center">
        <p className="text-lg font-bold text-brand">상담 요청이 접수되었습니다</p>
        <p className="mt-1 text-sm text-muted">
          {companyName}에서 고르신 내용과 견적을 보고 곧 연락드립니다.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      {Object.entries(hidden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <div className={compact ? "grid grid-cols-2 gap-2" : "grid gap-3 sm:grid-cols-2"}>
        <div>
          <label className="label" htmlFor="lead-name">성함</label>
          <input id="lead-name" name="name" className="input" placeholder="홍길동" autoComplete="name" required />
        </div>
        <div>
          <label className="label" htmlFor="lead-phone">휴대폰</label>
          <input
            id="lead-phone"
            name="phone"
            className="input"
            placeholder="010-1234-5678"
            inputMode="tel"
            autoComplete="tel"
            required
          />
        </div>
        {!compact && (
          <>
            <div>
              <label className="label" htmlFor="lead-dong">지역 (동까지)</label>
              <input id="lead-dong" name="dong" className="input" placeholder="옥정동" />
            </div>
            <div>
              <label className="label" htmlFor="lead-move">입주·공사 희망 시기</label>
              <input id="lead-move" name="moveIn" className="input" placeholder="2027년 1월" />
            </div>
          </>
        )}
      </div>
      {!compact && (
        <div>
          <label className="label" htmlFor="lead-msg">남기실 말씀 (선택)</label>
          <textarea id="lead-msg" name="message" rows={2} className="input" placeholder="원하는 분위기, 꼭 바꾸고 싶은 곳" />
        </div>
      )}
      <label className="flex items-start gap-2 text-xs text-muted">
        <input type="checkbox" name="consent" className="mt-0.5 accent-[var(--brand)]" required />
        <span>
          상담을 위해 이름·연락처·지역을 수집하며, 상담 종료 후 1년 뒤 파기합니다. (개인정보 수집·이용 동의)
        </span>
      </label>
      {state.error && <p className="text-sm font-medium text-danger">{state.error}</p>}
      <button type="submit" className="btn-primary w-full py-3 text-base" disabled={pending}>
        {pending ? "보내는 중…" : "이 견적으로 상담 요청하기"}
      </button>
    </form>
  );
}
