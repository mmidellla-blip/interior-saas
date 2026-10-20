import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PageSkeleton from "@/components/PageSkeleton";
import RoomScene from "@/components/RoomScene";
import ShowroomCard from "@/components/ShowroomCard";
import { estimateByProcesses, formatRange } from "@/lib/estimate";
import { getCompanyBySlug, getPortfolio, getShowrooms } from "@/lib/queries";
import { DEFAULT_ROOM } from "@/lib/room";

export async function generateMetadata({ params }: PageProps<"/c/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCompanyBySlug(slug);
  return data
    ? { title: `${data.company.name} — ${data.company.tagline}`, description: data.company.intro }
    : { title: "업체를 찾을 수 없습니다" };
}

async function CompanyHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  const { company, priceItems } = data;
  const portfolio = await getPortfolio(company.id);
  const showrooms = (await getShowrooms(company.id)).slice(0, 3);
  const base = `/c/${company.slug}`;
  const defaultKeys = priceItems.filter((p) => p.defaultOn).map((p) => p.key);
  const sample = estimateByProcesses(priceItems, 32, defaultKeys, "standard");

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:pt-16">
        <p className="text-sm font-semibold text-wood">{company.region}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
          {company.tagline}
        </h1>
        <p className="mt-4 max-w-2xl text-muted sm:text-lg">{company.intro}</p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={`${base}/estimate`} className="btn-primary px-5 py-3 text-base">
            우리 집 견적 1분 만에 보기
          </Link>
          <Link href={`${base}/room`} className="btn-outline px-5 py-3 text-base">
            미니룸으로 꾸며보기
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-12 md:grid-cols-2">
        <Link href={`${base}/estimate`} className="card group flex flex-col justify-between p-6 transition-shadow hover:shadow-lg">
          <div>
            <span className="chip bg-wood-soft text-wood">견적 계산기</span>
            <h2 className="mt-3 text-xl font-bold">평수와 공정만 고르면 범위 견적</h2>
            <p className="mt-1 text-sm text-muted">평균 가격이 아니라 {company.name}의 실제 단가로 계산합니다.</p>
          </div>
          <div className="mt-6 rounded-xl bg-ink p-4 text-white">
            <p className="text-xs text-white/60">예시 · 32평 · 스탠다드 · {defaultKeys.length}개 공정</p>
            <p className="text-2xl font-extrabold">약 {formatRange(sample)}</p>
          </div>
        </Link>
        <Link href={`${base}/room`} className="card group overflow-hidden transition-shadow hover:shadow-lg">
          <div className="p-6 pb-0">
            <span className="chip bg-brand-soft text-brand">미니룸 꾸미기</span>
            <h2 className="mt-3 text-xl font-bold">바닥·벽·주방을 바꾸면 견적도 바로</h2>
            <p className="mt-1 text-sm text-muted">말로 설명하기 어려운 취향을 그림으로 골라 보내 주세요.</p>
          </div>
          <div className="bg-gradient-to-b from-transparent to-[#efe8dc] px-6 pt-2 pb-4">
            <RoomScene room={DEFAULT_ROOM} className="mx-auto h-44 w-auto transition-transform group-hover:scale-[1.03]" />
          </div>
        </Link>
      </section>

      {showrooms.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">이웃들의 집자랑</h2>
              <p className="mt-1 text-sm text-muted">미니룸으로 꾸민 집과 가게. 마음에 들면 그대로 따라 꾸며 보세요.</p>
            </div>
            <Link href={`${base}/rooms`} className="text-sm font-semibold text-brand">
              전체 보기 →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {showrooms.map((s) => (
              <ShowroomCard key={s.id} showroom={s} href={`${base}/rooms/${s.id}`} />
            ))}
          </div>
        </section>
      )}

      <section id="portfolio" className="border-t border-line bg-surface py-12">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-extrabold">시공 사례</h2>
              <p className="mt-1 text-sm text-muted">고객님이 공개에 동의한 현장만 올립니다.</p>
            </div>
            <span className="text-sm text-muted">{portfolio.length}곳</span>
          </div>
          {portfolio.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed border-line p-10 text-center text-muted">
              아직 공개된 사례가 없습니다.
            </p>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {portfolio.map(({ project, cover, photoCount }) => (
                <Link key={project.id} href={`${base}/portfolio/${project.id}`} className="group">
                  <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-line">
                    {cover && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover.src}
                        alt={project.title}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span className="chip bg-paper text-muted">{project.dong}</span>
                    <span className="chip bg-paper text-muted">{project.area}평</span>
                    <span className="chip bg-paper text-muted">{project.style}</span>
                  </div>
                  <h3 className="mt-1.5 font-bold group-hover:text-brand">{project.title}</h3>
                  <p className="text-xs text-muted">사진 {photoCount}장 · 공사 과정 전체 공개</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="card flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold">대표가 직접 상담합니다</h2>
            <p className="text-sm text-muted">공사 중에는 매일 현장 사진을 링크로 보내 드려요.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${company.phone}`} className="btn-primary">
              {company.phone}
            </a>
            {company.kakaoUrl && (
              <a href={company.kakaoUrl} className="btn-outline">
                카카오톡 상담
              </a>
            )}
            {company.blogUrl && (
              <a href={company.blogUrl} className="btn-outline" target="_blank" rel="noreferrer">
                블로그
              </a>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default function Page({ params }: PageProps<"/c/[slug]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CompanyHome params={params} />
    </Suspense>
  );
}
