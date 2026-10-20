"use client";

import { useMemo, useState } from "react";
import { clampArea, estimateByProcesses, formatRange, formatWon } from "@/lib/estimate";
import { GRADE_LABEL, GRADES, UNIT_LABEL, type Grade, type PriceItem } from "@/lib/types";
import LeadForm from "./LeadForm";

const AREA_PRESETS = [18, 24, 32, 40];

export default function EstimateCalculator({
  slug,
  companyName,
  priceItems,
  variant = "page",
}: {
  slug: string;
  companyName: string;
  priceItems: PriceItem[];
  variant?: "page" | "widget";
}) {
  const [area, setArea] = useState(32);
  const [grade, setGrade] = useState<Grade>("standard");
  const [keys, setKeys] = useState<string[]>(() => priceItems.filter((p) => p.defaultOn).map((p) => p.key));
  const [showForm, setShowForm] = useState(false);

  const result = useMemo(() => estimateByProcesses(priceItems, area, keys, grade), [priceItems, area, keys, grade]);
  const widget = variant === "widget";

  function toggle(key: string) {
    setKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  return (
    <div className={widget ? "space-y-4" : "grid gap-6 lg:grid-cols-[1fr_380px]"}>
      <div className="space-y-6">
        <section>
          <h2 className="mb-2 text-sm font-bold text-muted">1. 집 크기 (공급 평수)</h2>
          <div className="flex flex-wrap items-center gap-2">
            {AREA_PRESETS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setArea(a)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold ${
                  area === a ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"
                }`}
              >
                {a}평
              </button>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="number"
                min={10}
                max={80}
                value={area}
                onChange={(e) => setArea(clampArea(e.target.value))}
                className="input w-20 text-center"
                aria-label="평수 직접 입력"
              />
              평
            </label>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-muted">2. 공사할 곳</h2>
          <div className={`grid gap-2 ${widget ? "grid-cols-2" : "sm:grid-cols-2"}`}>
            {priceItems.map((item) => {
              const on = keys.includes(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggle(item.key)}
                  aria-pressed={on}
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    on ? "border-brand bg-brand-soft" : "border-line bg-surface hover:border-brand/50"
                  }`}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-semibold">{item.name}</span>
                    <span
                      className={`grid h-5 w-5 place-items-center rounded-md border text-xs ${
                        on ? "border-brand bg-brand text-white" : "border-line"
                      }`}
                    >
                      {on ? "✓" : ""}
                    </span>
                  </span>
                  {!widget && <span className="mt-1 block text-xs text-muted">{item.description}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-bold text-muted">3. 자재 등급</h2>
          <div className="grid grid-cols-3 gap-2">
            {GRADES.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGrade(g)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold ${
                  grade === g ? "border-brand bg-brand text-white" : "border-line bg-surface hover:border-brand"
                }`}
              >
                {GRADE_LABEL[g]}
              </button>
            ))}
          </div>
        </section>
      </div>

      <aside className={widget ? "" : "lg:sticky lg:top-6 lg:self-start"}>
        <div className="card overflow-hidden">
          <div className="bg-ink p-5 text-white">
            <p className="text-sm text-white/70">
              {area}평 · {GRADE_LABEL[grade]} · {keys.length}개 공정
            </p>
            <p className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl" aria-live="polite">
              {keys.length ? `약 ${formatRange(result)}` : "공정을 골라 주세요"}
            </p>
            <p className="mt-2 text-xs text-white/60">{companyName} 실제 단가 기준 · 현장 상태에 따라 달라질 수 있어요</p>
          </div>
          {!widget && result.lines.length > 0 && (
            <ul className="divide-y divide-line px-5 text-sm">
              {result.lines.map((line) => {
                const item = priceItems.find((p) => p.key === line.key)!;
                return (
                  <li key={line.key} className="flex items-center justify-between py-2.5">
                    <span>
                      {line.name}
                      <span className="ml-1.5 text-xs text-muted">{UNIT_LABEL[item.unit]}</span>
                    </span>
                    <span className="font-semibold tabular-nums">{formatWon(line.amount)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-line p-5">
            {showForm || widget ? (
              <LeadForm
                slug={slug}
                companyName={companyName}
                compact={widget}
                hidden={{
                  source: widget ? "widget" : "calculator",
                  area: String(area),
                  grade,
                  processes: keys.join(","),
                }}
              />
            ) : (
              <button type="button" className="btn-primary w-full py-3 text-base" onClick={() => setShowForm(true)} disabled={!keys.length}>
                이 견적으로 상담 받기
              </button>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
