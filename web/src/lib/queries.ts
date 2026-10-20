import "server-only";
import { cookies } from "next/headers";
import { readDb } from "./db";
import { dayKey } from "./format";
import { findLayout } from "./room";
import type { Company, Photo, PriceItem, Project, Showroom } from "./types";

export interface PublicCompany {
  company: Company;
  priceItems: PriceItem[];
}

export async function getCompanyBySlug(slug: string): Promise<PublicCompany | null> {
  const db = await readDb();
  const company = db.companies.find((c) => c.slug === slug);
  if (!company) return null;
  const priceItems = db.priceItems
    .filter((p) => p.companyId === company.id)
    .sort((a, b) => a.order - b.order);
  return { company, priceItems };
}

/** 공개용 현장 정보. 고객 이름·연락처·상세 주소는 절대 내보내지 않는다. */
export interface PublicProject {
  id: string;
  title: string;
  dong: string;
  area: number;
  style: string;
  startDate: string;
  endDate?: string;
  status: Project["status"];
  currentStage?: Project["currentStage"];
  summary: string;
}

export function toPublicProject(p: Project): PublicProject {
  return {
    id: p.id,
    title: p.title,
    dong: p.dong,
    area: p.area,
    style: p.style,
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    currentStage: p.currentStage,
    summary: p.summary,
  };
}

function isPortfolio(p: Project): boolean {
  return p.portfolioConsent && p.portfolioPublic && p.status === "done";
}

export interface PortfolioEntry {
  project: PublicProject;
  cover?: Photo;
  before?: Photo;
  photoCount: number;
}

export async function getPortfolio(companyId: string): Promise<PortfolioEntry[]> {
  const db = await readDb();
  return db.projects
    .filter((p) => p.companyId === companyId && isPortfolio(p))
    .sort((a, b) => (b.endDate ?? "").localeCompare(a.endDate ?? ""))
    .map((p) => {
      const photos = db.photos.filter((ph) => ph.projectId === p.id && ph.companyId === companyId);
      return {
        project: toPublicProject(p),
        cover: photos.find((ph) => ph.kind === "after") ?? photos.at(-1),
        before: photos.find((ph) => ph.kind === "before"),
        photoCount: photos.length,
      };
    });
}

export async function getPortfolioDetail(companyId: string, projectId: string) {
  const db = await readDb();
  const project = db.projects.find((p) => p.id === projectId && p.companyId === companyId);
  if (!project || !isPortfolio(project)) return null;
  const photos = db.photos
    .filter((ph) => ph.projectId === project.id && ph.companyId === companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { project: toPublicProject(project), photos };
}

export async function getSharedProject(token: string) {
  const db = await readDb();
  const project = db.projects.find((p) => p.shareToken === token);
  if (!project) return null;
  if (new Date(project.shareExpiresAt).getTime() < Date.now()) return { expired: true as const };
  const company = db.companies.find((c) => c.id === project.companyId)!;
  const photos = db.photos
    .filter((ph) => ph.projectId === project.id && ph.companyId === project.companyId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { expired: false as const, company, project: toPublicProject(project), photos };
}

// ── 집자랑 ────────────────────────────────────────────────

/** 공개용 집자랑. 수정 토큰·숨김 여부는 내보내지 않는다 */
export type PublicShowroom = Omit<Showroom, "editToken" | "companyId" | "hidden">;

export type ShowroomSummary = Omit<PublicShowroom, "guestbook"> & { guestbookCount: number };

function toPublicShowroom(s: Showroom): PublicShowroom {
  return {
    id: s.id,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    title: s.title,
    nickname: s.nickname,
    intro: s.intro,
    mood: s.mood,
    bgm: s.bgm,
    room: s.room,
    likes: s.likes,
    visitsTotal: s.visitsTotal,
    // 날짜가 바뀌었으면 오늘 방문자는 0부터
    visitsToday: s.visitsDate === dayKey(new Date().toISOString()) ? s.visitsToday : 0,
    visitsDate: s.visitsDate,
    guestbook: [...s.guestbook].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export async function getShowrooms(
  companyId: string,
  { sort = "popular", kind }: { sort?: "popular" | "new"; kind?: "home" | "shop" } = {},
): Promise<ShowroomSummary[]> {
  const db = await readDb();
  return db.showrooms
    .filter((s) => s.companyId === companyId && !s.hidden)
    .filter((s) => !kind || findLayout(s.room.layout).kind === kind)
    .sort((a, b) =>
      sort === "new" ? b.createdAt.localeCompare(a.createdAt) : b.likes - a.likes || b.visitsTotal - a.visitsTotal,
    )
    .map((s) => {
      const { guestbook, ...rest } = toPublicShowroom(s);
      return { ...rest, guestbookCount: guestbook.length };
    });
}

export async function getShowroom(companyId: string, id: string): Promise<PublicShowroom | null> {
  const db = await readDb();
  const showroom = db.showrooms.find((s) => s.id === id && s.companyId === companyId && !s.hidden);
  return showroom ? toPublicShowroom(showroom) : null;
}

export const LIKED_COOKIE = "liked_rooms";

/** 이 브라우저가 이미 공감을 눌렀는지 */
export async function isLiked(id: string): Promise<boolean> {
  const value = (await cookies()).get(LIKED_COOKIE)?.value ?? "";
  return value.split(".").includes(id);
}
