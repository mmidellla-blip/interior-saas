import Link from "next/link";
import RoomScene from "@/components/RoomScene";
import { estimateByRoom, formatRange } from "@/lib/estimate";
import { defaultFurniture } from "@/lib/room";
import { createSeed } from "@/lib/seed";
import type { RoomConfig } from "@/lib/types";

const HERO_ROOM: RoomConfig = {
  layout: "square",
  furniture: defaultFurniture("square"),
  floor: "herringbone",
  wall: "accent",
  door: "black",
  window: "linen",
  kitchen: "stone",
  lighting: "indirect",
  sofa: "boucle",
  addons: ["planter", "shelf"],
};

const MODULES = [
  {
    tag: "01 · 견적 계산기",
    title: "“대충 얼마예요?” 전화 대신",
    body: "평수·공정·등급을 고르면 사장님 단가표로 “약 2,800만~3,300만 원” 범위를 보여주고, 연락처를 받아 문의로 등록합니다. 블로그에 스크립트 한 줄로 붙습니다.",
  },
  {
    tag: "02 · 미니룸 꾸미기",
    title: "취향을 말 대신 그림으로",
    body: "바닥재·벽지·주방·조명을 고르면 방 그림과 견적이 동시에 바뀝니다. 상담 요청이 오면 고객이 고른 방과 금액이 그대로 전달됩니다.",
  },
  {
    tag: "03 · 현장 공유 페이지",
    title: "“어디까지 됐어요?” 연락이 줄어듭니다",
    body: "폰으로 공정별 사진을 올리면 고객은 로그인 없이 링크로 타임라인을 봅니다. 위치정보는 자동으로 지워집니다.",
  },
  {
    tag: "04 · 포트폴리오",
    title: "끝난 공사가 저절로 사례가 됩니다",
    body: "공사 중 올린 사진이 그대로 전후 비교 포트폴리오가 됩니다. 고객이 동의한 현장만, 동 단위 지역까지만 공개합니다.",
  },
];

const PLANS = [
  { name: "무료", price: "0원", desc: "체험·입소문", items: ["포트폴리오 페이지", "견적 계산기 월 문의 5건"] },
  { name: "베이직", price: "49,000원", desc: "1인 업체", items: ["견적 계산기 무제한", "포트폴리오", "문의 알림"] },
  {
    name: "프로",
    price: "99,000원",
    desc: "월 2건 이상 시공",
    items: ["베이직 전체", "미니룸 꾸미기", "현장 공유 무제한"],
    highlight: true,
  },
];

export default function Home() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="flex items-center gap-2 font-extrabold">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-sm text-white">집</span>
          집공방
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <a href="#pricing" className="btn-ghost hidden sm:inline-flex">요금</a>
          <Link href="/admin" className="btn-ghost">업체 로그인</Link>
          <Link href="/c/haneul" className="btn-primary">데모 보기</Link>
        </nav>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div>
          <p className="chip bg-wood-soft text-wood">동네 인테리어 업체를 위한 고객 응대 도구</p>
          <h1 className="mt-4 text-4xl leading-[1.15] font-extrabold tracking-tight sm:text-5xl">
            플랫폼 수수료 없이,
            <br />
            <span className="text-brand">내 블로그로 온 고객</span>을
            <br />
            계약까지.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            상담 전에 고객의 취향과 예산을 알고, 공사 중 문의를 줄이고, 끝난 공사가 저절로 포트폴리오가 되게.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Link href="/c/haneul" className="btn-primary px-5 py-3 text-base">
              데모 업체 페이지 보기
            </Link>
            <Link href="/c/haneul/room" className="btn-outline px-5 py-3 text-base">
              미니룸 꾸며보기
            </Link>
          </div>
          <p className="mt-4 text-sm text-muted">초기 10곳은 셋업 무료 + 3개월 무료 · 건당 수수료 없음</p>
        </div>
        <div className="card relative bg-gradient-to-b from-[#f4efe6] to-[#e9e1d3] p-6">
          <RoomScene room={HERO_ROOM} className="w-full" />
          <div className="absolute -bottom-5 left-6 right-6 rounded-2xl bg-ink p-4 text-white shadow-xl sm:left-auto sm:w-64">
            <p className="text-xs text-white/60">32평 · 고객이 고른 마감</p>
            <p className="text-xl font-extrabold">약 {formatRange(estimateByRoom(createSeed().priceItems, 32, HERO_ROOM))}</p>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-extrabold sm:text-3xl">현장 하나로 이어지는 네 가지 모듈</h2>
          <p className="mt-2 text-muted">고객이 들어오는 순간부터, 공사가 끝나 다음 고객을 데려오기까지 한 흐름.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {MODULES.map((m) => (
              <div key={m.tag} className="rounded-2xl border border-line p-6">
                <p className="text-xs font-bold text-wood">{m.tag}</p>
                <h3 className="mt-2 text-lg font-bold">{m.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{m.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-extrabold sm:text-3xl">중개 플랫폼과 무엇이 다른가요</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ["업체 실제 단가", "플랫폼 평균 가격이 아니라 그 업체의 단가표로 실시간 견적을 냅니다."],
            ["사진 한 번, 두 가지 효과", "공사 중에는 고객 안심, 끝나면 포트폴리오. 따로 정리할 필요가 없습니다."],
            ["업체 이름으로 된 페이지", "고객은 우리 서비스가 아니라 사장님 업체를 봅니다. 고객을 빼앗지 않습니다."],
          ].map(([t, b]) => (
            <div key={t} className="card p-6">
              <h3 className="font-bold">{t}</h3>
              <p className="mt-2 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t border-line bg-surface py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-extrabold sm:text-3xl">계약 한 건이면 일 년 치 요금</h2>
          <p className="mt-2 text-muted">월 요금, 부가세 별도 · 연간 결제 시 2개월 할인 · 건당 수수료 없음</p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <div
                key={p.name}
                className={`rounded-2xl border p-6 ${p.highlight ? "border-brand bg-brand-soft" : "border-line"}`}
              >
                <p className="text-sm font-bold text-muted">{p.name} · {p.desc}</p>
                <p className="mt-2 text-3xl font-extrabold">{p.price}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {p.items.map((i) => (
                    <li key={i}>✓ {i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            셋업 대행 (1회 300,000원): 단가표 입력, 기존 사진 포트폴리오 이관, 블로그 연결까지 해 드립니다.
          </p>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-center text-sm text-muted">
        집공방 · 수수료 없는 내 고객 관리
      </footer>
    </div>
  );
}
