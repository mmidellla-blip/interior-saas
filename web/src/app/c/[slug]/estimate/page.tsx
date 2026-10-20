import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import EstimateCalculator from "@/components/EstimateCalculator";
import PageSkeleton from "@/components/PageSkeleton";
import { getCompanyBySlug } from "@/lib/queries";

export const metadata: Metadata = { title: "견적 계산기" };

async function Estimate({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold sm:text-3xl">우리 집 리모델링, 대략 얼마일까?</h1>
      <p className="mt-1 mb-8 text-muted">
        {data.company.name}의 실제 공정별 단가로 계산한 범위 견적입니다. 정확한 금액은 실측 후 안내드려요.
      </p>
      <EstimateCalculator slug={data.company.slug} companyName={data.company.name} priceItems={data.priceItems} />
    </div>
  );
}

export default function Page({ params }: PageProps<"/c/[slug]/estimate">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Estimate params={params} />
    </Suspense>
  );
}
