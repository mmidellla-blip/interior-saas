import { defaultFurniture, normalizeRoom } from "./room";
import type { Database, Photo, PriceItem, Showroom, Stage, PhotoKind } from "./types";

const COMPANY_ID = "cmp_demo";

const priceItems: Omit<PriceItem, "id" | "companyId" | "order">[] = [
  { key: "demolition", name: "철거", description: "기존 마감재·주방·욕실 철거 및 폐기물 처리", unit: "pyeong", prices: { basic: 100_000, standard: 120_000, premium: 150_000 }, defaultOn: true },
  { key: "electric", name: "설비·전기", description: "배선 교체, 콘센트·스위치 이동, 배관 보수", unit: "pyeong", prices: { basic: 150_000, standard: 200_000, premium: 280_000 }, defaultOn: false },
  { key: "carpentry", name: "목공·도어", description: "몰딩·걸레받이, 천장 평탄화, 문틀·도어 교체", unit: "pyeong", prices: { basic: 250_000, standard: 350_000, premium: 480_000 }, defaultOn: false },
  { key: "wallpaper", name: "도배·도장", description: "실크벽지 / 포인트 벽 / 친환경 도장", unit: "pyeong", prices: { basic: 100_000, standard: 140_000, premium: 220_000 }, defaultOn: true },
  { key: "floor", name: "바닥", description: "강마루 / 원목마루 / 포세린 타일", unit: "pyeong", prices: { basic: 150_000, standard: 250_000, premium: 450_000 }, defaultOn: true },
  { key: "film", name: "필름", description: "문·문틀·붙박이장 인테리어 필름", unit: "pyeong", prices: { basic: 80_000, standard: 120_000, premium: 160_000 }, defaultOn: false },
  { key: "lighting", name: "조명", description: "LED 평판등 / 다운라이트 / 간접조명", unit: "pyeong", prices: { basic: 50_000, standard: 90_000, premium: 150_000 }, defaultOn: true },
  { key: "window", name: "창호(샷시)", description: "발코니·거실 창호 교체", unit: "pyeong", prices: { basic: 400_000, standard: 550_000, premium: 700_000 }, defaultOn: false },
  { key: "kitchen", name: "주방", description: "싱크대·상판·후드·수전 교체", unit: "set", prices: { basic: 4_500_000, standard: 7_500_000, premium: 12_000_000 }, defaultOn: true },
  { key: "bath", name: "욕실", description: "타일·도기·수전·천장재 (25평 이상 욕실 2개 기준)", unit: "bath", prices: { basic: 3_500_000, standard: 5_000_000, premium: 7_500_000 }, defaultOn: true },
];

interface SeedPhoto {
  file: string;
  stage: Stage;
  kind: PhotoKind;
  caption: string;
  day: string;
}

function photos(projectId: string, list: SeedPhoto[]): Photo[] {
  return list.map((p, i) => ({
    id: `${projectId}_ph${i + 1}`,
    companyId: COMPANY_ID,
    projectId,
    stage: p.stage,
    kind: p.kind,
    caption: p.caption,
    src: `/seed/${p.file}.svg`,
    width: 1200,
    height: 900,
    createdAt: `${p.day}T17:30:00+09:00`,
  }));
}

/** 갤러리가 비어 보이지 않게 넣어 두는 집자랑 예시 */
export function seedShowrooms(): Showroom[] {
  const sample = (
    id: string,
    day: string,
    fields: Pick<Showroom, "title" | "nickname" | "intro" | "mood" | "bgm" | "likes" | "visitsTotal">,
    room: Record<string, unknown>,
    guestbook: [string, string][],
  ): Showroom => ({
    id,
    companyId: COMPANY_ID,
    createdAt: `${day}T20:00:00+09:00`,
    updatedAt: `${day}T20:00:00+09:00`,
    ...fields,
    room: normalizeRoom(room),
    editToken: `seed-${id}`,
    visitsToday: 0,
    visitsDate: day,
    hidden: false,
    guestbook: guestbook.map(([nickname, message], i) => ({
      id: `${id}_g${i}`,
      nickname,
      message,
      createdAt: `${day}T21:${String(10 + i * 7).padStart(2, "0")}:00+09:00`,
    })),
  });
  return [
    sample(
      "show_okjeong",
      "2026-10-12",
      {
        title: "옥정동 신혼집 거실 🌿",
        nickname: "초록이네",
        intro: "세이지 소파에 헤링본 바닥, 꿈꾸던 거실 완성!",
        mood: "flutter",
        bgm: "프리스타일 - Y",
        likes: 24,
        visitsTotal: 318,
      },
      { layout: "square", floor: "herringbone", wall: "sage", door: "white", lighting: "indirect", sofa: "sage", addons: ["planter"] },
      [
        ["옆집언니", "소파 색 너무 예뻐요!! 저도 따라 할래요"],
        ["민트초코", "펜던트 조명 분위기 최고 ✨"],
      ],
    ),
    sample(
      "show_cafe",
      "2026-10-15",
      {
        title: "골목 끝 작은 카페 ☕",
        nickname: "라떼사장",
        intro: "내년 봄 오픈 준비중인 카페 미리 꾸며봤어요",
        mood: "party",
        bgm: "자우림 - 매직 카펫 라이드",
        likes: 41,
        visitsTotal: 562,
      },
      {
        layout: "cafe",
        floor: "porcelain",
        wall: "accent",
        door: "black",
        window: "blind",
        kitchen: "stone",
        lighting: "downlight",
        sofa: "leather",
        furniture: defaultFurniture("cafe"),
      },
      [["단골예약", "오픈하면 꼭 갈게요 🙌"]],
    ),
    sample(
      "show_studio",
      "2026-10-17",
      {
        title: "자취 3년차 원룸 리뉴얼",
        nickname: "냥집사",
        intro: "고양이랑 둘이 사는 아늑한 방",
        mood: "happy",
        bgm: "아이유 - 밤편지",
        likes: 17,
        visitsTotal: 143,
      },
      { layout: "studio", floor: "oak", wall: "silk", window: "linen", sofa: "boucle", lighting: "downlight" },
      [],
    ),
  ];
}

export function createSeed(): Database {
  return {
    companies: [
      {
        id: COMPANY_ID,
        slug: "haneul",
        name: "하늘인테리어",
        tagline: "아파트·빌라 리모델링, 대표가 직접 시공합니다",
        ownerName: "김하늘",
        phone: "010-1234-5678",
        region: "경기 양주·의정부",
        intro:
          "15년 동안 현장에서 직접 망치를 들어 온 작은 인테리어 회사입니다. 견적은 투명하게, 공사 과정은 매일 사진으로 공유해 드립니다.",
        blogUrl: "https://blog.naver.com/",
        instagramUrl: "https://instagram.com/",
      },
    ],
    priceItems: priceItems.map((item, i) => ({ ...item, id: `pi_${item.key}`, companyId: COMPANY_ID, order: i })),
    leads: [
      {
        id: "lead_1",
        companyId: COMPANY_ID,
        createdAt: "2026-10-18T21:12:00+09:00",
        name: "박지은",
        phone: "010-2222-3333",
        dong: "옥정동",
        area: 34,
        moveIn: "2027년 1월",
        message: "아이 방 하나는 밝은 톤으로 하고 싶어요.",
        source: "room",
        estimate: { lines: [], total: 33_000_000, min: 30_300_000, max: 35_700_000 },
        room: {
          layout: "square",
          furniture: defaultFurniture("square"),
          floor: "oak",
          wall: "accent",
          door: "wood",
          window: "linen",
          kitchen: "island",
          lighting: "indirect",
          sofa: "sage",
          addons: ["planter"],
        },
        status: "new",
        memo: "",
      },
      {
        id: "lead_2",
        companyId: COMPANY_ID,
        createdAt: "2026-10-16T10:40:00+09:00",
        name: "이준호",
        phone: "010-4444-5555",
        dong: "고읍동",
        area: 24,
        source: "calculator",
        estimate: { lines: [], total: 26_000_000, min: 23_900_000, max: 28_100_000 },
        status: "consulting",
        memo: "10/20 저녁 7시 실측 방문",
      },
    ],
    projects: [
      {
        id: "prj_okjeong",
        companyId: COMPANY_ID,
        title: "옥정 아파트 32평 화이트 오크",
        customerName: "최민서",
        customerPhone: "010-1111-2222",
        address: "경기 양주시 옥정동 OO아파트 101동 1203호",
        dong: "양주 옥정동",
        area: 32,
        style: "내추럴·우드",
        startDate: "2026-08-04",
        endDate: "2026-09-12",
        status: "done",
        currentStage: "조명·마감",
        summary: "20년 된 체리색 몰딩을 걷어내고 화이트 벽에 오크 마루를 깔았습니다. 주방은 ㄱ자에 아일랜드를 더해 거실과 이어지게 했습니다.",
        shareToken: "demo-okjeong-7f3k2p9x",
        shareExpiresAt: "2027-12-31T23:59:59+09:00",
        portfolioConsent: true,
        portfolioPublic: true,
        createdAt: "2026-07-20T10:00:00+09:00",
      },
      {
        id: "prj_yangju",
        companyId: COMPANY_ID,
        title: "양주 단독주택 전체 리모델링",
        customerName: "(자가 현장)",
        customerPhone: "",
        address: "경기 양주시 백석읍",
        dong: "양주 백석읍",
        area: 38,
        style: "모던·그린",
        startDate: "2026-10-01",
        status: "in_progress",
        currentStage: "목공",
        summary: "경매로 받은 30년 된 단독주택을 처음부터 다시 만듭니다.",
        shareToken: "demo-yangju-q8m4w2zt",
        shareExpiresAt: "2027-06-30T23:59:59+09:00",
        portfolioConsent: true,
        portfolioPublic: false,
        createdAt: "2026-09-20T10:00:00+09:00",
      },
      {
        id: "prj_uijeongbu",
        companyId: COMPANY_ID,
        title: "의정부 빌라 24평 그레이지",
        customerName: "정다은",
        customerPhone: "010-6666-7777",
        address: "경기 의정부시 민락동 OO빌라 302호",
        dong: "의정부 민락동",
        area: 24,
        style: "모던·그레이지",
        startDate: "2026-06-02",
        endDate: "2026-06-30",
        status: "done",
        currentStage: "조명·마감",
        summary: "좁은 빌라 거실을 넓어 보이게 포세린 타일과 간접조명으로 마감했습니다.",
        shareToken: "demo-uijeongbu-h5n7c1rv",
        shareExpiresAt: "2026-12-31T23:59:59+09:00",
        portfolioConsent: true,
        portfolioPublic: true,
        createdAt: "2026-05-15T10:00:00+09:00",
      },
    ],
    showrooms: seedShowrooms(),
    photos: [
      ...photos("prj_okjeong", [
        { file: "before-living", stage: "철거", kind: "before", caption: "공사 전 거실. 체리색 몰딩과 오래된 장판", day: "2026-08-04" },
        { file: "demolition", stage: "철거", kind: "progress", caption: "철거 완료, 바닥 레벨 확인", day: "2026-08-06" },
        { file: "electric", stage: "설비·전기", kind: "progress", caption: "거실 다운라이트 배선 작업", day: "2026-08-11" },
        { file: "carpentry", stage: "목공", kind: "progress", caption: "천장 평탄화 및 간접조명 박스", day: "2026-08-18" },
        { file: "tile", stage: "욕실", kind: "progress", caption: "욕실 600각 타일 시공", day: "2026-08-25" },
        { file: "wallpaper", stage: "도배·도장", kind: "progress", caption: "실크 도배 마무리", day: "2026-09-02" },
        { file: "after-oak", stage: "조명·마감", kind: "after", caption: "완공 거실. 오크 마루와 화이트 벽", day: "2026-09-12" },
        { file: "after-kitchen", stage: "주방", kind: "after", caption: "ㄱ자 주방 + 아일랜드", day: "2026-09-12" },
      ]),
      ...photos("prj_yangju", [
        { file: "before-house", stage: "철거", kind: "before", caption: "경매로 받은 직후 거실", day: "2026-10-01" },
        { file: "demolition", stage: "철거", kind: "progress", caption: "내부 전체 철거", day: "2026-10-05" },
        { file: "electric", stage: "설비·전기", kind: "progress", caption: "전기 배선 전면 교체", day: "2026-10-11" },
        { file: "carpentry", stage: "목공", kind: "progress", caption: "벽체 보강, 단열재 시공 시작", day: "2026-10-17" },
      ]),
      ...photos("prj_uijeongbu", [
        { file: "before-villa", stage: "철거", kind: "before", caption: "공사 전 빌라 거실", day: "2026-06-02" },
        { file: "tile", stage: "타일", kind: "progress", caption: "거실 포세린 타일", day: "2026-06-16" },
        { file: "after-greige", stage: "조명·마감", kind: "after", caption: "완공. 간접조명과 그레이지 도장", day: "2026-06-30" },
      ]),
    ],
  };
}
