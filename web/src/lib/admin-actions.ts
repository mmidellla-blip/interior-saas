"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { adminConfigured, checkPassword, endSession, requireAdmin, startSession } from "./auth";
import { mutateDb, newId, newShareToken, readDb, UPLOAD_DIR } from "./db";
import {
  GRADES,
  STAGES,
  type LeadStatus,
  type PhotoKind,
  type ProjectStatus,
  type Stage,
} from "./types";

function text(form: FormData, key: string, max = 200): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

const LEAD_STATUSES: LeadStatus[] = ["new", "contacted", "consulting", "contracted", "lost"];
const PROJECT_STATUSES: ProjectStatus[] = ["planned", "in_progress", "done"];
const PHOTO_KINDS: PhotoKind[] = ["before", "progress", "after"];
const SHARE_DAYS = 180;

function asStage(value: string): Stage | undefined {
  return (STAGES as readonly string[]).includes(value) ? (value as Stage) : undefined;
}

function shareExpiry(): string {
  return new Date(Date.now() + SHARE_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

// ── 로그인 ────────────────────────────────────────────────

export async function login(_prev: { error?: string }, form: FormData): Promise<{ error?: string }> {
  if (!adminConfigured()) {
    return { error: "관리자 설정 전이에요. Vercel 환경변수 ADMIN_PASSWORD와 SESSION_SECRET을 넣고 다시 배포해 주세요." };
  }
  if (!checkPassword(String(form.get("password") ?? ""))) {
    return { error: "비밀번호가 맞지 않습니다." };
  }
  const db = await readDb();
  await startSession(db.companies[0].id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

// ── 문의 ──────────────────────────────────────────────────

export async function updateLead(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  const status = text(form, "status") as LeadStatus;
  await mutateDb((db) => {
    const lead = db.leads.find((l) => l.id === id && l.companyId === companyId);
    if (!lead) return;
    if (LEAD_STATUSES.includes(status)) lead.status = status;
    if (form.has("memo")) lead.memo = text(form, "memo", 1000);
  });
  refresh();
}

// ── 집자랑 ────────────────────────────────────────────────

export async function setShowroomHidden(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  await mutateDb((db) => {
    const showroom = db.showrooms.find((s) => s.id === id && s.companyId === companyId);
    if (showroom) showroom.hidden = form.get("hidden") === "true";
  });
  refresh();
}

export async function deleteShowroom(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  await mutateDb((db) => {
    db.showrooms = db.showrooms.filter((s) => !(s.id === id && s.companyId === companyId));
  });
  refresh();
}

export async function deleteGuestbookEntry(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  const entryId = text(form, "entryId");
  await mutateDb((db) => {
    const showroom = db.showrooms.find((s) => s.id === id && s.companyId === companyId);
    if (showroom) showroom.guestbook = showroom.guestbook.filter((g) => g.id !== entryId);
  });
  refresh();
}

// ── 현장 ──────────────────────────────────────────────────

function projectFields(form: FormData) {
  const status = text(form, "status") as ProjectStatus;
  return {
    title: text(form, "title", 80) || "이름 없는 현장",
    customerName: text(form, "customerName", 30),
    customerPhone: text(form, "customerPhone", 20),
    address: text(form, "address", 120),
    dong: text(form, "dong", 30),
    area: Math.max(1, Math.min(200, Number(form.get("area")) || 0)),
    style: text(form, "style", 30),
    startDate: text(form, "startDate", 10),
    endDate: text(form, "endDate", 10) || undefined,
    status: PROJECT_STATUSES.includes(status) ? status : "planned",
    currentStage: asStage(text(form, "currentStage")),
    summary: text(form, "summary", 1000),
    portfolioConsent: form.get("portfolioConsent") === "on",
  };
}

export async function createProject(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = newId("prj");
  await mutateDb((db) => {
    db.projects.push({
      id,
      companyId,
      ...projectFields(form),
      shareToken: newShareToken(),
      shareExpiresAt: shareExpiry(),
      portfolioPublic: false,
      createdAt: new Date().toISOString(),
    });
  });
  redirect(`/admin/projects/${id}`);
}

export async function updateProject(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  await mutateDb((db) => {
    const project = db.projects.find((p) => p.id === id && p.companyId === companyId);
    if (!project) return;
    Object.assign(project, projectFields(form));
    // 고객 동의가 빠지면 포트폴리오에서도 즉시 내린다.
    if (!project.portfolioConsent) project.portfolioPublic = false;
  });
  refresh();
}

export async function setPortfolioPublic(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  const value = form.get("value") === "1";
  await mutateDb((db) => {
    const project = db.projects.find((p) => p.id === id && p.companyId === companyId);
    if (!project) return;
    project.portfolioPublic = value && project.portfolioConsent;
  });
  refresh();
}

export async function regenerateShareLink(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  await mutateDb((db) => {
    const project = db.projects.find((p) => p.id === id && p.companyId === companyId);
    if (!project) return;
    project.shareToken = newShareToken();
    project.shareExpiresAt = shareExpiry();
  });
  refresh();
}

export async function deleteProject(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  const removed = await mutateDb((db) => {
    const files = db.photos.filter((p) => p.projectId === id && p.companyId === companyId);
    db.photos = db.photos.filter((p) => !(p.projectId === id && p.companyId === companyId));
    db.projects = db.projects.filter((p) => !(p.id === id && p.companyId === companyId));
    return files;
  });
  await Promise.all(removed.map((p) => removeUpload(p.src)));
  redirect("/admin/projects");
}

// ── 사진 ──────────────────────────────────────────────────

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/**
 * 사진은 브라우저에서 긴 변 1600px JPEG로 다시 그려서 올라온다.
 * 캔버스로 다시 그리면 EXIF(GPS 위치정보 포함)가 사라진다.
 */
export async function uploadPhotos(form: FormData): Promise<{ count: number; error?: string }> {
  const { companyId } = await requireAdmin();
  const projectId = text(form, "projectId");
  const stage = asStage(text(form, "stage")) ?? STAGES[0];
  const kindRaw = text(form, "kind") as PhotoKind;
  const kind = PHOTO_KINDS.includes(kindRaw) ? kindRaw : "progress";
  const caption = text(form, "caption", 200);
  const files = form.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  const sizes = form.getAll("sizes").map(String);

  const db = await readDb();
  if (!db.projects.some((p) => p.id === projectId && p.companyId === companyId)) {
    return { count: 0, error: "현장을 찾을 수 없습니다." };
  }

  const dir = path.join(UPLOAD_DIR, companyId);
  await mkdir(dir, { recursive: true });

  const saved: { name: string; width: number; height: number }[] = [];
  for (const [i, file] of files.entries()) {
    if (file.type !== "image/jpeg" || file.size > MAX_PHOTO_BYTES) continue;
    const bytes = Buffer.from(await file.arrayBuffer());
    // JPEG 시그니처 확인
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) continue;
    const name = `${newId("img")}.jpg`;
    await writeFile(path.join(dir, name), bytes);
    const [w, h] = (sizes[i] ?? "1600x1200").split("x").map(Number);
    saved.push({ name, width: w || 1600, height: h || 1200 });
  }

  await mutateDb((db) => {
    const now = new Date().toISOString();
    for (const s of saved) {
      db.photos.push({
        id: newId("ph"),
        companyId,
        projectId,
        stage,
        kind,
        caption,
        src: `/api/files/${companyId}/${s.name}`,
        width: s.width,
        height: s.height,
        createdAt: now,
      });
    }
    const project = db.projects.find((p) => p.id === projectId);
    if (project && kind === "progress") {
      project.currentStage = stage;
      if (project.status === "planned") project.status = "in_progress";
    }
  });
  refresh();
  return { count: saved.length, error: saved.length < files.length ? "일부 파일은 올리지 못했습니다." : undefined };
}

async function removeUpload(src: string): Promise<void> {
  const match = src.match(/^\/api\/files\/([\w-]+)\/([\w-]+\.jpg)$/);
  if (!match) return;
  await unlink(path.join(UPLOAD_DIR, match[1], match[2])).catch(() => undefined);
}

export async function deletePhoto(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  const photo = await mutateDb((db) => {
    const found = db.photos.find((p) => p.id === id && p.companyId === companyId);
    db.photos = db.photos.filter((p) => p !== found);
    return found;
  });
  if (photo) await removeUpload(photo.src);
  refresh();
}

export async function updatePhotoCaption(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  const id = text(form, "id");
  await mutateDb((db) => {
    const photo = db.photos.find((p) => p.id === id && p.companyId === companyId);
    if (photo) photo.caption = text(form, "caption", 200);
  });
  refresh();
}

// ── 단가표 · 업체 정보 ────────────────────────────────────

export async function updatePrices(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  await mutateDb((db) => {
    for (const item of db.priceItems.filter((p) => p.companyId === companyId)) {
      for (const grade of GRADES) {
        const value = Number(String(form.get(`${item.id}.${grade}`) ?? "").replace(/,/g, ""));
        if (Number.isFinite(value) && value >= 0) item.prices[grade] = Math.round(value);
      }
      item.defaultOn = form.get(`${item.id}.defaultOn`) === "on";
    }
  });
  refresh();
}

export async function updateCompany(form: FormData): Promise<void> {
  const { companyId } = await requireAdmin();
  await mutateDb((db) => {
    const company = db.companies.find((c) => c.id === companyId);
    if (!company) return;
    company.name = text(form, "name", 40) || company.name;
    company.tagline = text(form, "tagline", 80);
    company.ownerName = text(form, "ownerName", 20);
    company.phone = text(form, "phone", 20);
    company.region = text(form, "region", 40);
    company.intro = text(form, "intro", 500);
    company.kakaoUrl = text(form, "kakaoUrl", 200) || undefined;
    company.blogUrl = text(form, "blogUrl", 200) || undefined;
    company.instagramUrl = text(form, "instagramUrl", 200) || undefined;
  });
  refresh();
}
