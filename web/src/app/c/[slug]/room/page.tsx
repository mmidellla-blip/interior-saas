import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import RoomDesigner from "@/components/RoomDesigner";
import { getCompanyBySlug, getShowroom } from "@/lib/queries";

export const metadata: Metadata = { title: "미니룸 꾸미기" };

async function Room({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { slug } = await params;
  const { from } = await searchParams;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  // 집자랑에서 "따라 꾸미기"로 들어오면 그 방에서 시작
  const source = from ? await getShowroom(data.company.id, from) : null;
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <h1 className="text-2xl font-extrabold sm:text-3xl">미니룸으로 우리 집 꾸며보기</h1>
      <p className="mt-1 mb-8 text-muted">
        {source
          ? `${source.nickname}님의 "${source.title}"에서 시작해요. 마음대로 바꿔 보세요.`
          : "구조를 고르고 가구를 끌어다 놓으면 그림과 견적이 함께 바뀝니다. 다 꾸몄으면 상담을 요청하거나 미니홈피로 자랑하세요."}
      </p>
      <RoomDesigner
        key={source?.id ?? "new"}
        slug={data.company.slug}
        companyName={data.company.name}
        priceItems={data.priceItems}
        initialRoom={source?.room}
        fromId={source?.id}
      />
    </div>
  );
}

export default function Page({ params, searchParams }: PageProps<"/c/[slug]/room">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Room params={params} searchParams={searchParams} />
    </Suspense>
  );
}
