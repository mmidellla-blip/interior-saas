import type { Grade, PlacedFurniture, RoomConfig } from "./types";

/**
 * 미니룸 선택지 정의. 각 카테고리는 견적과 연결되는 방식이 다르다.
 * - item: 업체 단가표의 공정(priceKey)을 선택지 등급으로 계산
 * - fixed: 선택지마다 정해진 금액
 * - none: 그림에만 반영 (가구처럼 시공 견적에 들어가지 않는 것)
 */
export interface RoomOption {
  id: string;
  label: string;
  note: string;
  swatch: string;
  grade?: Grade;
  price?: number;
}

type Pricing = { type: "item"; priceKey: string } | { type: "fixed" } | { type: "none" };

export type RoomCategoryId = Exclude<keyof RoomConfig, "addons" | "layout" | "furniture">;

export interface RoomCategory {
  id: RoomCategoryId;
  label: string;
  pricing: Pricing;
  options: RoomOption[];
}

export const ROOM_CATEGORIES: RoomCategory[] = [
  {
    id: "floor",
    label: "바닥재",
    pricing: { type: "item", priceKey: "floor" },
    options: [
      { id: "laminate", label: "강마루", note: "생활 흠집에 강하고 무난", grade: "basic", swatch: "#c8a27a" },
      { id: "oak", label: "원목마루", note: "따뜻한 오크 결", grade: "standard", swatch: "#a8794f" },
      { id: "herringbone", label: "헤링본 원목", note: "지그재그 패턴", grade: "premium", swatch: "#9a6b45" },
      { id: "porcelain", label: "포세린 타일", note: "넓어 보이는 대형 타일", grade: "premium", swatch: "#d9d6d0" },
    ],
  },
  {
    id: "wall",
    label: "벽 마감",
    pricing: { type: "item", priceKey: "wallpaper" },
    options: [
      { id: "silk", label: "실크벽지", note: "깔끔한 화이트", grade: "basic", swatch: "#f3efe8" },
      { id: "accent", label: "포인트 템바보드", note: "소파 뒤 우드 루버", grade: "standard", swatch: "#d7c3a3" },
      { id: "sage", label: "세이지 포인트 도장", note: "소파 뒤 한 면만 컬러", grade: "standard", swatch: "#a9b8a3" },
      { id: "paint", label: "친환경 전체 도장", note: "매트한 그레이지 톤", grade: "premium", swatch: "#d8d2c8" },
    ],
  },
  {
    id: "door",
    label: "문·몰딩",
    pricing: { type: "item", priceKey: "film" },
    options: [
      { id: "white", label: "화이트 필름", note: "문·몰딩 화이트", grade: "basic", swatch: "#f7f6f2" },
      { id: "wood", label: "우드 필름", note: "내추럴 오크 톤", grade: "standard", swatch: "#b98a5e" },
      { id: "black", label: "무몰딩 + 블랙 프레임", note: "슬림 블랙 도어 프레임", grade: "premium", swatch: "#2d2d2d" },
    ],
  },
  {
    id: "window",
    label: "창 꾸미기",
    pricing: { type: "fixed" },
    options: [
      { id: "none", label: "없음", note: "창틀만", swatch: "#cfe3ec", price: 0 },
      { id: "blind", label: "우드 블라인드", note: "빛 조절이 쉬움", swatch: "#c49a6c", price: 400_000 },
      { id: "linen", label: "린넨 커튼", note: "부드러운 아이보리", swatch: "#eee6d8", price: 600_000 },
      { id: "motor", label: "전동 암막 커튼", note: "커튼박스 + 모터", swatch: "#6f7c86", price: 1_500_000 },
    ],
  },
  {
    id: "kitchen",
    label: "주방",
    pricing: { type: "item", priceKey: "kitchen" },
    options: [
      { id: "basic", label: "일자형 싱크대", note: "하이그로시 화이트", grade: "basic", swatch: "#f7f7f5" },
      { id: "island", label: "ㄱ자 + 아일랜드", note: "우드 상판 아일랜드", grade: "standard", swatch: "#b98a5e" },
      { id: "stone", label: "대면형 + 세라믹 상판", note: "다크 그린 도어", grade: "premium", swatch: "#41584b" },
    ],
  },
  {
    id: "lighting",
    label: "조명",
    pricing: { type: "item", priceKey: "lighting" },
    options: [
      { id: "flat", label: "LED 평판등", note: "밝고 실용적", grade: "basic", swatch: "#fffbe6" },
      { id: "downlight", label: "매입 다운라이트", note: "천장이 깔끔", grade: "standard", swatch: "#ffe9b3" },
      { id: "indirect", label: "간접조명 + 펜던트", note: "호텔 같은 분위기", grade: "premium", swatch: "#ffd680" },
    ],
  },
  {
    id: "sofa",
    label: "가구 스타일",
    pricing: { type: "none" },
    options: [
      { id: "sage", label: "세이지 패브릭", note: "견적 미포함 · 분위기 참고", swatch: "#8a9a8e" },
      { id: "leather", label: "브라운 가죽", note: "견적 미포함 · 분위기 참고", swatch: "#8b5a3c" },
      { id: "boucle", label: "아이보리 부클", note: "견적 미포함 · 분위기 참고", swatch: "#e6dfd2" },
    ],
  },
];

export interface RoomAddon {
  id: string;
  label: string;
  note: string;
  price: number;
}

export const ROOM_ADDONS: RoomAddon[] = [
  { id: "planter", label: "실내 텃밭·화분 코너", note: "아이와 함께 키우는 선반형 화분대", price: 1_200_000 },
  { id: "shelf", label: "벽 선반 수납", note: "현관 쪽 벽 오픈 선반 3단", price: 1_500_000 },
];

/**
 * 집 구조. width는 오른쪽 벽(현관·주방) 길이, depth는 왼쪽 벽(창) 길이.
 * notch가 있으면 앞쪽 모서리 [notch[0]..width] × [notch[1]..depth] 영역이 없는 ㄱ자 구조다.
 * 상가(shop)는 오른쪽 벽이 유리 쇼윈도(front: "glass")이고, 주방이 없는 곳(kitchen: false)도 있다.
 */
export interface RoomLayout {
  id: string;
  kind: "home" | "shop";
  label: string;
  note: string;
  width: number;
  depth: number;
  notch?: [number, number];
  front?: "door" | "glass";
  kitchen?: boolean;
  furniture: PlacedFurniture[];
}

export const LAYOUT_KIND_LABEL: Record<RoomLayout["kind"], string> = { home: "집", shop: "상가" };

const f = (type: string, x: number, y: number, rot = 0): PlacedFurniture => ({ type, x, y, rot });

const LIVING_SET = [
  f("rug", 1.9, 4.2),
  f("sofa", 0, 4.2),
  f("coffee", 2.6, 5.6),
  f("lamp", 0.3, 9.05),
  f("plant", 0.4, 3.1),
  f("minime", 4.6, 7.2),
];

export const ROOM_LAYOUTS: RoomLayout[] = [
  { id: "square", kind: "home", label: "거실+주방", note: "가장 흔한 정사각 구조", width: 10, depth: 10, furniture: LIVING_SET },
  {
    id: "studio",
    kind: "home",
    label: "원룸",
    note: "작고 아늑한 한 칸",
    width: 8,
    depth: 7,
    furniture: [f("bed", 0, 3.7), f("plant", 0.4, 3.0), f("side", 0.1, 2.85), f("cat", 3.4, 5.6, 1), f("minime", 5, 5.6)],
  },
  {
    id: "officetel",
    kind: "home",
    label: "오피스텔",
    note: "창 쪽으로 길쭉한 1.5룸",
    width: 8,
    depth: 12,
    furniture: [
      f("desk", 0, 4.0),
      f("bookcase", 0, 6.6),
      f("rug", 1.6, 6.8),
      f("bed", 0, 8.6),
      f("plant", 0.4, 3.1),
      f("minime", 3.0, 5.4),
    ],
  },
  { id: "wide", kind: "home", label: "넓은 거실", note: "주방 쪽으로 긴 확장형", width: 13, depth: 10, furniture: LIVING_SET },
  { id: "deep", kind: "home", label: "깊은 거실", note: "창 쪽으로 긴 구조", width: 9, depth: 13, furniture: LIVING_SET },
  {
    id: "lshape",
    kind: "home",
    label: "ㄱ자 구조",
    note: "한쪽 모서리가 꺾인 집",
    width: 12,
    depth: 12,
    notch: [8, 8],
    furniture: LIVING_SET,
  },
  {
    id: "penthouse",
    kind: "home",
    label: "펜트하우스",
    note: "피아노도 들어가는 큰 집",
    width: 16,
    depth: 12,
    furniture: [
      ...LIVING_SET,
      f("armchair", 4.6, 4.4, 2),
      f("piano", 5.5, 0, 1),
      f("dining", 11, 6.2),
      f("dog", 3.4, 9.6),
      f("tree", 0.2, 10.6),
    ],
  },
  {
    id: "cafe",
    kind: "shop",
    label: "카페",
    note: "쇼윈도 + 오픈 바",
    width: 12,
    depth: 10,
    front: "glass",
    kitchen: true,
    furniture: [
      f("counter", 6.2, 2.4, 1),
      f("showcase", 9.6, 2.4, 1),
      f("cafetable", 0.6, 3.6),
      f("cafetable", 0.6, 6.2),
      f("cafetable", 3.6, 5.0),
      f("menuboard", 2.6, 0.6, 1),
      f("plant", 0.3, 8.9),
      f("plant", 5.2, 8.9),
      f("minime", 7.4, 4.4),
    ],
  },
  {
    id: "restaurant",
    kind: "shop",
    label: "식당",
    note: "4인 테이블 위주 홀",
    width: 13,
    depth: 11,
    front: "glass",
    kitchen: true,
    furniture: [
      f("dining", 0.8, 3.8),
      f("dining", 0.8, 7.4),
      f("dining", 4.4, 3.8),
      f("dining", 4.4, 7.4),
      f("counter", 8.2, 2.6, 1),
      f("menuboard", 2.6, 0.6, 1),
      f("plant", 0.3, 10.2),
      f("minime", 8.6, 5.0),
    ],
  },
  {
    id: "office",
    kind: "shop",
    label: "사무실",
    note: "책상 4개 + 회의 공간",
    width: 14,
    depth: 10,
    kitchen: false,
    furniture: [
      f("desk", 1.1, 3.5, 2),
      f("desk", 3.0, 3.5),
      f("desk", 1.1, 6.0, 2),
      f("desk", 3.0, 6.0),
      f("meeting", 8.5, 4.5),
      f("bookcase", 3.0, 0, 1),
      f("bookcase", 5.0, 0, 1),
      f("plant", 12.9, 0.3),
      f("plant", 0.3, 9.1),
      f("minime", 6.4, 6.6),
    ],
  },
  {
    id: "salon",
    kind: "shop",
    label: "미용실",
    note: "거울 좌석 3개",
    width: 10,
    depth: 11,
    front: "glass",
    kitchen: false,
    furniture: [
      f("salonchair", 0, 3.8),
      f("salonchair", 0, 5.5),
      f("salonchair", 0, 7.2),
      f("counter", 7.0, 1.8, 1),
      f("sofa", 8.4, 6.0, 2),
      f("plant", 0.3, 10.2),
      f("minime", 2.4, 6.0, 2),
    ],
  },
  {
    id: "store",
    kind: "shop",
    label: "옷가게",
    note: "행거·진열대 편집숍",
    width: 12,
    depth: 9,
    front: "glass",
    kitchen: false,
    furniture: [
      f("rack", 0, 3.6),
      f("rack", 0, 6.2),
      f("display", 4.0, 3.6),
      f("display", 4.0, 6.0, 2),
      f("counter", 8.4, 2.0, 1),
      f("rug", 1.4, 4.0),
      f("plant", 11.0, 8.0),
      f("minime", 2.6, 5.0),
    ],
  },
];

/** 옮길 수 있는 가구. size는 회전 전 [벽에서 앞쪽으로의 깊이, 벽을 따라 늘어선 길이] */
export interface FurnitureType {
  id: string;
  label: string;
  group: FurnitureGroup;
  size: [number, number];
  /** 러그처럼 바닥에 깔려서 항상 다른 가구보다 아래에 그리는 것 */
  flat?: boolean;
}

export type FurnitureGroup = "living" | "bedroom" | "dining" | "shop" | "deco";

export const FURNITURE_GROUP_LABEL: Record<FurnitureGroup, string> = {
  living: "거실",
  bedroom: "침실·서재",
  dining: "주방·식당",
  shop: "상가",
  deco: "소품·펫",
};

export const FURNITURE_TYPES: FurnitureType[] = [
  { id: "sofa", label: "3인 소파", group: "living", size: [1.6, 4.4] },
  { id: "armchair", label: "1인 체어", group: "living", size: [1.5, 1.5] },
  { id: "coffee", label: "거실 테이블", group: "living", size: [1.6, 1.6] },
  { id: "side", label: "사이드 테이블", group: "living", size: [0.8, 0.8] },
  { id: "rug", label: "러그", group: "living", size: [3.1, 4.2], flat: true },
  { id: "tv", label: "TV·거실장", group: "living", size: [0.8, 3.6] },
  { id: "lamp", label: "플로어 스탠드", group: "living", size: [0.6, 0.6] },
  { id: "bed", label: "침대", group: "bedroom", size: [4.2, 3.2] },
  { id: "wardrobe", label: "옷장", group: "bedroom", size: [1.2, 2.4] },
  { id: "desk", label: "책상", group: "bedroom", size: [1.9, 2.4] },
  { id: "bookcase", label: "책장", group: "bedroom", size: [0.8, 1.8] },
  { id: "dining", label: "식탁 세트", group: "dining", size: [2.4, 2.6] },
  { id: "cafetable", label: "카페 테이블", group: "dining", size: [2.2, 1.0] },
  { id: "counter", label: "계산대·바", group: "shop", size: [1.2, 3.0] },
  { id: "showcase", label: "음료 쇼케이스", group: "shop", size: [1.0, 2.0] },
  { id: "display", label: "진열대", group: "shop", size: [0.9, 2.4] },
  { id: "rack", label: "옷 행거", group: "shop", size: [0.8, 2.4] },
  { id: "salonchair", label: "미용 의자·거울", group: "shop", size: [1.8, 1.4] },
  { id: "meeting", label: "회의 테이블", group: "shop", size: [2.6, 4.0] },
  { id: "menuboard", label: "입간판", group: "shop", size: [0.6, 1.0] },
  { id: "plant", label: "화분", group: "deco", size: [0.6, 0.6] },
  { id: "minime", label: "미니미", group: "deco", size: [0.6, 0.6] },
  { id: "dog", label: "강아지", group: "deco", size: [1.2, 0.6] },
  { id: "cat", label: "고양이", group: "deco", size: [0.8, 0.5] },
  { id: "bear", label: "곰인형", group: "deco", size: [0.7, 0.7] },
  { id: "tree", label: "트리", group: "deco", size: [1.2, 1.2] },
  { id: "piano", label: "피아노", group: "deco", size: [1.5, 2.8] },
  { id: "fishtank", label: "어항", group: "deco", size: [0.8, 2.0] },
];

export const MAX_FURNITURE = 40;

export function findLayout(id: string): RoomLayout {
  return ROOM_LAYOUTS.find((l) => l.id === id) ?? ROOM_LAYOUTS[0];
}

export function findFurniture(id: string): FurnitureType | undefined {
  return FURNITURE_TYPES.find((f) => f.id === id);
}

/** 회전을 반영해 가구가 차지하는 바닥 영역 */
export function footprint(item: PlacedFurniture): { x: number; y: number; w: number; d: number } {
  const [w, d] = findFurniture(item.type)?.size ?? [1, 1];
  return item.rot % 2 === 0 ? { x: item.x, y: item.y, w, d } : { x: item.x, y: item.y, w: d, d: w };
}

const snap = (n: number) => Math.round(n * 10) / 10;

/** 가구가 방 밖이나 ㄱ자 구조의 빈 모서리로 나가지 않게 밀어 넣는다 */
export function clampFurniture(layoutId: string, item: PlacedFurniture): PlacedFurniture {
  const layout = findLayout(layoutId);
  const rot = ((Math.round(item.rot) % 4) + 4) % 4;
  const { w, d } = footprint({ ...item, rot });
  let x = Math.min(Math.max(0, snap(item.x)), Math.max(0, layout.width - w));
  let y = Math.min(Math.max(0, snap(item.y)), Math.max(0, layout.depth - d));
  if (layout.notch) {
    const [nx, ny] = layout.notch;
    if (x + w > nx && y + d > ny) {
      if (x + w - nx <= y + d - ny) x = Math.max(0, nx - w);
      else y = Math.max(0, ny - d);
    }
  }
  return { type: item.type, x: snap(x), y: snap(y), rot };
}

export function defaultFurniture(layoutId: string): PlacedFurniture[] {
  return findLayout(layoutId).furniture.map((item) => clampFurniture(layoutId, item));
}

export const DEFAULT_ROOM: RoomConfig = {
  layout: "square",
  furniture: defaultFurniture("square"),
  floor: "oak",
  wall: "silk",
  door: "white",
  window: "linen",
  kitchen: "island",
  lighting: "downlight",
  sofa: "sage",
  addons: [],
};

export function findCategory(id: RoomCategoryId): RoomCategory {
  return ROOM_CATEGORIES.find((c) => c.id === id)!;
}

export function findOption(categoryId: RoomCategoryId, optionId: string): RoomOption {
  const category = findCategory(categoryId);
  return category.options.find((o) => o.id === optionId) ?? category.options[0];
}

/**
 * 어떤 입력이 와도 유효한 RoomConfig로 만든다. 예전 형식({ planter: true })도 받아 준다.
 */
export function normalizeRoom(input: unknown): RoomConfig {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const room = {} as RoomConfig;
  room.layout = findLayout(String(raw.layout ?? DEFAULT_ROOM.layout)).id;
  const furniture = Array.isArray(raw.furniture) ? raw.furniture : defaultFurniture(room.layout);
  room.furniture = furniture
    .flatMap((f): PlacedFurniture[] => {
      if (!f || typeof f !== "object") return [];
      const { type, x, y, rot } = f as Record<string, unknown>;
      if (!findFurniture(String(type))) return [];
      const nums = [x, y, rot].map(Number);
      if (!nums.every(Number.isFinite)) return [];
      return [clampFurniture(room.layout, { type: String(type), x: nums[0], y: nums[1], rot: nums[2] })];
    })
    .slice(0, MAX_FURNITURE);
  for (const category of ROOM_CATEGORIES) {
    const value = raw[category.id] ?? DEFAULT_ROOM[category.id];
    room[category.id] = findOption(category.id, String(value)).id;
  }
  const addons = Array.isArray(raw.addons) ? raw.addons.map(String) : raw.planter ? ["planter"] : [];
  room.addons = ROOM_ADDONS.filter((a) => addons.includes(a.id)).map((a) => a.id);
  return room;
}

export function describeRoom(input: unknown): string {
  const room = normalizeRoom(input);
  const parts = [`구조 ${findLayout(room.layout).label}`];
  parts.push(...ROOM_CATEGORIES.map((c) => `${c.label} ${findOption(c.id, room[c.id]).label}`));
  for (const addon of ROOM_ADDONS) if (room.addons.includes(addon.id)) parts.push(addon.label);
  if (room.furniture.length > 0) parts.push(`가구 ${room.furniture.length}개`);
  return parts.join(" · ");
}
