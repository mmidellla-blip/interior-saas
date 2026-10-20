export type Grade = "basic" | "standard" | "premium";

export const GRADES: Grade[] = ["basic", "standard", "premium"];

export const GRADE_LABEL: Record<Grade, string> = {
  basic: "기본",
  standard: "스탠다드",
  premium: "프리미엄",
};

/** 단가 단위: 평당, 1식(주방 한 세트), 욕실 1개당 */
export type PriceUnit = "pyeong" | "set" | "bath";

export const UNIT_LABEL: Record<PriceUnit, string> = {
  pyeong: "평당",
  set: "1식",
  bath: "욕실 1개",
};

export interface Company {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  ownerName: string;
  phone: string;
  region: string;
  intro: string;
  kakaoUrl?: string;
  blogUrl?: string;
  instagramUrl?: string;
}

export interface PriceItem {
  id: string;
  companyId: string;
  key: string;
  name: string;
  description: string;
  unit: PriceUnit;
  prices: Record<Grade, number>;
  /** 견적 계산기에서 처음부터 체크되어 있는지 */
  defaultOn: boolean;
  order: number;
}

export type LeadStatus = "new" | "contacted" | "consulting" | "contracted" | "lost";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "새 문의",
  contacted: "연락함",
  consulting: "상담 중",
  contracted: "계약",
  lost: "보류·종료",
};

export type LeadSource = "calculator" | "room" | "widget";

export const LEAD_SOURCE_LABEL: Record<LeadSource, string> = {
  calculator: "견적 계산기",
  room: "미니룸 꾸미기",
  widget: "블로그 위젯",
};

/** 미니룸에 놓인 가구 하나. x·y는 차지하는 바닥 영역의 안쪽(벽 쪽) 모서리, rot은 90도 단위 회전(0~3) */
export interface PlacedFurniture {
  type: string;
  x: number;
  y: number;
  rot: number;
}

export interface RoomConfig {
  /** 집 구조(방 크기·모양) id */
  layout: string;
  /** 사용자가 직접 배치한 가구 */
  furniture: PlacedFurniture[];
  floor: string;
  wall: string;
  door: string;
  window: string;
  kitchen: string;
  lighting: string;
  sofa: string;
  /** 추가 항목 id 목록 (실내 텃밭, 벽 선반 등) */
  addons: string[];
}

export interface EstimateLine {
  key: string;
  name: string;
  grade: Grade;
  amount: number;
}

export interface EstimateResult {
  lines: EstimateLine[];
  total: number;
  min: number;
  max: number;
}

export interface Lead {
  id: string;
  companyId: string;
  createdAt: string;
  name: string;
  phone: string;
  dong: string;
  area: number;
  moveIn?: string;
  message?: string;
  source: LeadSource;
  estimate: EstimateResult;
  room?: RoomConfig;
  status: LeadStatus;
  memo: string;
}

export type ProjectStatus = "planned" | "in_progress" | "done";

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  planned: "착공 전",
  in_progress: "공사 중",
  done: "완료",
};

export const STAGES = [
  "철거",
  "설비·전기",
  "목공",
  "타일",
  "욕실",
  "주방",
  "도배·도장",
  "바닥",
  "조명·마감",
] as const;

export type Stage = (typeof STAGES)[number];

export type PhotoKind = "before" | "progress" | "after";

export const PHOTO_KIND_LABEL: Record<PhotoKind, string> = {
  before: "공사 전",
  progress: "공사 중",
  after: "완공",
};

export interface Project {
  id: string;
  companyId: string;
  title: string;
  /** 비공개: 관리자만 봄 */
  customerName: string;
  customerPhone: string;
  address: string;
  /** 공개 페이지에는 동 단위까지만 */
  dong: string;
  area: number;
  style: string;
  startDate: string;
  endDate?: string;
  status: ProjectStatus;
  currentStage?: Stage;
  summary: string;
  shareToken: string;
  shareExpiresAt: string;
  portfolioConsent: boolean;
  portfolioPublic: boolean;
  createdAt: string;
}

export interface Photo {
  id: string;
  companyId: string;
  projectId: string;
  stage: Stage;
  kind: PhotoKind;
  caption: string;
  /** /api/files/... 또는 /seed/... */
  src: string;
  width: number;
  height: number;
  createdAt: string;
}

/** 미니홈피 방명록 한 줄 */
export interface GuestbookEntry {
  id: string;
  nickname: string;
  message: string;
  createdAt: string;
}

export const MOODS = {
  happy: "😊 행복",
  proud: "😎 뿌듯",
  flutter: "🥰 설렘",
  party: "🎉 신남",
  thinking: "🤔 고민중",
  tired: "😴 피곤",
} as const;

export type Mood = keyof typeof MOODS;

/** 집자랑: 손님이 꾸민 미니룸을 미니홈피처럼 공개한 것 */
export interface Showroom {
  id: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  title: string;
  nickname: string;
  intro: string;
  mood: Mood;
  /** 화면에 곡 제목만 보여 준다 */
  bgm: string;
  room: RoomConfig;
  /** 만든 사람만 아는 수정 토큰. 공개 화면으로 절대 내보내지 않는다 */
  editToken: string;
  likes: number;
  visitsTotal: number;
  visitsToday: number;
  /** visitsToday가 어느 날짜(한국 시간) 기준인지 */
  visitsDate: string;
  /** 관리자가 숨긴 글 */
  hidden: boolean;
  guestbook: GuestbookEntry[];
}

export interface Database {
  companies: Company[];
  priceItems: PriceItem[];
  leads: Lead[];
  projects: Project[];
  photos: Photo[];
  showrooms: Showroom[];
}
