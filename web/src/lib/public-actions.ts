"use server";

import { mutateDb, newId } from "./db";
import { clampArea, estimateByProcesses, estimateByRoom } from "./estimate";
import { normalizeRoom } from "./room";
import { GRADES, type Grade, type Lead, type LeadSource } from "./types";

export interface LeadFormState {
  ok: boolean;
  error?: string;
}

const PHONE = /^01[016789]-?\d{3,4}-?\d{4}$/;

function text(form: FormData, key: string, max: number): string {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

/**
 * 견적 계산기·미니룸·위젯에서 들어오는 문의. 금액은 클라이언트 값을 믿지 않고
 * 서버에서 업체 단가표로 다시 계산한다.
 */
export async function submitLead(_prev: LeadFormState, form: FormData): Promise<LeadFormState> {
  const slug = text(form, "slug", 60);
  const name = text(form, "name", 30);
  const phone = text(form, "phone", 20).replace(/\s/g, "");
  const dong = text(form, "dong", 30);
  const sourceRaw = text(form, "source", 20);
  const source: LeadSource = sourceRaw === "room" || sourceRaw === "widget" ? sourceRaw : "calculator";

  if (!name) return { ok: false, error: "성함을 적어 주세요." };
  if (!PHONE.test(phone)) return { ok: false, error: "휴대폰 번호를 확인해 주세요. (예: 010-1234-5678)" };
  if (form.get("consent") !== "on") return { ok: false, error: "개인정보 수집·이용에 동의해 주세요." };

  const area = clampArea(form.get("area"));

  return mutateDb((db) => {
    const company = db.companies.find((c) => c.slug === slug);
    if (!company) return { ok: false, error: "업체 정보를 찾을 수 없습니다." };
    const items = db.priceItems.filter((p) => p.companyId === company.id);

    let lead: Lead;
    const base = {
      id: newId("lead"),
      companyId: company.id,
      createdAt: new Date().toISOString(),
      name,
      phone,
      dong,
      area,
      moveIn: text(form, "moveIn", 30) || undefined,
      message: text(form, "message", 500) || undefined,
      source,
      status: "new" as const,
      memo: "",
    };

    if (source === "room") {
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(String(form.get("room") ?? "null").slice(0, 8000));
      } catch {
        // 잘못된 값이면 기본 구성으로
      }
      const room = normalizeRoom(parsed);
      lead = { ...base, room, estimate: estimateByRoom(items, area, room) };
    } else {
      const gradeRaw = text(form, "grade", 20) as Grade;
      const grade = GRADES.includes(gradeRaw) ? gradeRaw : "standard";
      const keys = String(form.get("processes") ?? "").split(",").filter(Boolean);
      lead = { ...base, estimate: estimateByProcesses(items, area, keys, grade) };
    }

    db.leads.push(lead);
    return { ok: true };
  });
}
