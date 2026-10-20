import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import CopyButton from "@/components/admin/CopyButton";
import SubmitButton from "@/components/admin/SubmitButton";
import PageSkeleton from "@/components/PageSkeleton";
import { updateCompany } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { headers } from "next/headers";

export const metadata: Metadata = { title: "설정" };

function Field({
  name,
  label,
  value,
  placeholder,
  wide,
}: {
  name: string;
  label: string;
  value?: string;
  placeholder?: string;
  wide?: boolean;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input id={name} name={name} defaultValue={value} placeholder={placeholder} className="input" />
    </div>
  );
}

async function Settings() {
  const { companyId } = await requireAdmin();
  const db = await readDb();
  const company = db.companies.find((c) => c.id === companyId)!;
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const snippet = `<script src="${origin}/widget.js" data-company="${company.slug}"></script>`;
  const iframe = `<iframe src="${origin}/embed/${company.slug}" width="100%" height="860" style="max-width:480px;border:0"></iframe>`;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 md:py-8">
      <h1 className="text-2xl font-extrabold">설정</h1>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">내 업체 페이지</h2>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-paper px-3 py-2 text-sm">
            {origin}/c/{company.slug}
          </code>
          <CopyButton text={`/c/${company.slug}`} label="주소 복사" />
          <Link href={`/c/${company.slug}`} target="_blank" className="btn-ghost">
            열기 ↗
          </Link>
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <h2 className="font-bold">블로그·홈페이지에 견적 계산기 붙이기</h2>
        <p className="text-sm text-muted">아래 한 줄을 붙여 넣으면 그 자리에 견적 계산기가 나타나고, 문의가 여기로 들어옵니다.</p>
        <pre className="overflow-x-auto rounded-lg bg-ink p-3 text-xs text-white">{snippet}</pre>
        <CopyButton text={snippet} label="스크립트 복사" />
        <p className="pt-2 text-sm text-muted">
          네이버 블로그처럼 스크립트를 막는 곳은 아래 iframe 코드나 업체 페이지 링크를 쓰세요.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-paper p-3 text-xs">{iframe}</pre>
        <div className="flex gap-2">
          <CopyButton text={iframe} label="iframe 복사" />
          <Link href={`/embed/${company.slug}`} target="_blank" className="btn-ghost">
            위젯 미리보기 ↗
          </Link>
        </div>
      </section>

      <form action={updateCompany} className="card space-y-4 p-5">
        <h2 className="font-bold">업체 정보</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="name" label="업체 이름" value={company.name} />
          <Field name="ownerName" label="대표 이름" value={company.ownerName} />
          <Field name="phone" label="대표 연락처" value={company.phone} />
          <Field name="region" label="시공 지역" value={company.region} />
          <Field name="tagline" label="한 줄 소개" value={company.tagline} wide />
          <div className="sm:col-span-2">
            <label className="label" htmlFor="intro">
              업체 소개
            </label>
            <textarea id="intro" name="intro" rows={3} defaultValue={company.intro} className="input" />
          </div>
          <Field name="kakaoUrl" label="카카오톡 채널 주소" value={company.kakaoUrl} placeholder="https://pf.kakao.com/..." wide />
          <Field name="blogUrl" label="블로그 주소" value={company.blogUrl} />
          <Field name="instagramUrl" label="인스타그램 주소" value={company.instagramUrl} />
        </div>
        <SubmitButton>저장</SubmitButton>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Settings />
    </Suspense>
  );
}
