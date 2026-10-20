import { findOption, ROOM_ADDONS, ROOM_CATEGORIES } from "./room";
import type { EstimateLine, EstimateResult, Grade, PriceItem, RoomConfig } from "./types";

/** 범위 견적의 폭. 실제 현장 상태에 따라 달라지는 몫. */
const RANGE = 0.08;
const ROUND = 100_000;

export function bathCount(area: number): number {
  return area >= 25 ? 2 : 1;
}

function lineAmount(item: PriceItem, grade: Grade, area: number): number {
  const unitPrice = item.prices[grade];
  switch (item.unit) {
    case "pyeong":
      return unitPrice * area;
    case "bath":
      return unitPrice * bathCount(area);
    case "set":
      return unitPrice;
  }
}

function finish(lines: EstimateLine[]): EstimateResult {
  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return {
    lines,
    total,
    min: Math.floor((total * (1 - RANGE)) / ROUND) * ROUND,
    max: Math.ceil((total * (1 + RANGE)) / ROUND) * ROUND,
  };
}

/** 견적 계산기: 평수 + 고른 공정 + 등급 하나 */
export function estimateByProcesses(
  items: PriceItem[],
  area: number,
  keys: string[],
  grade: Grade,
): EstimateResult {
  const lines = items
    .filter((item) => keys.includes(item.key))
    .sort((a, b) => a.order - b.order)
    .map((item) => ({ key: item.key, name: item.name, grade, amount: lineAmount(item, grade, area) }));
  return finish(lines);
}

/** 미니룸: 마감재마다 등급이 다르고, 고정 금액 항목과 추가 항목이 붙는다 */
export function estimateByRoom(items: PriceItem[], area: number, room: RoomConfig): EstimateResult {
  const lines: EstimateLine[] = [];
  for (const category of ROOM_CATEGORIES) {
    const option = findOption(category.id, room[category.id]);
    if (category.pricing.type === "item") {
      const priceKey = category.pricing.priceKey;
      const item = items.find((i) => i.key === priceKey);
      if (!item) continue;
      const grade = option.grade ?? "standard";
      lines.push({
        key: item.key,
        name: `${item.name} · ${option.label}`,
        grade,
        amount: lineAmount(item, grade, area),
      });
    } else if (category.pricing.type === "fixed" && option.price) {
      lines.push({ key: category.id, name: `${category.label} · ${option.label}`, grade: "standard", amount: option.price });
    }
  }
  for (const addon of ROOM_ADDONS) {
    if (addon.price > 0 && room.addons.includes(addon.id)) {
      lines.push({ key: addon.id, name: addon.label, grade: "standard", amount: addon.price });
    }
  }
  return finish(lines);
}

export function clampArea(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 32;
  return Math.min(80, Math.max(10, n));
}

/** 3,450만 원 형식. 억 단위는 1억 2,300만 원. */
export function formatWon(amount: number): string {
  const man = Math.round(amount / 10_000);
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  if (eok > 0) return rest > 0 ? `${eok}억 ${rest.toLocaleString("ko-KR")}만` : `${eok}억`;
  return `${man.toLocaleString("ko-KR")}만`;
}

export function formatRange(result: Pick<EstimateResult, "min" | "max">): string {
  return `${formatWon(result.min)} ~ ${formatWon(result.max)} 원`;
}
