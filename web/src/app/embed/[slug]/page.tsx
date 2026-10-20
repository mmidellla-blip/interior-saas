import { notFound } from "next/navigation";
import { Suspense } from "react";
import EstimateCalculator from "@/components/EstimateCalculator";
import { getCompanyBySlug } from "@/lib/queries";

async function Widget({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  return (
    <div className="p-4">
      <p className="mb-3 text-base font-extrabold">{data.company.name} 1분 견적</p>
      <EstimateCalculator
        slug={data.company.slug}
        companyName={data.company.name}
        priceItems={data.priceItems}
        variant="widget"
      />
      <a
        href={`/c/${data.company.slug}`}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block text-center text-xs text-muted hover:text-brand"
      >
        {data.company.name} 시공 사례 보기 →
      </a>
    </div>
  );
}

/** 블로그·홈페이지에 iframe으로 들어가는 견적 위젯 */
export default function Page({ params }: PageProps<"/embed/[slug]">) {
  return (
    <Suspense fallback={<div className="h-96" />}>
      <Widget params={params} />
    </Suspense>
  );
}
