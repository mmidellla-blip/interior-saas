import type { Metadata } from "next";
import { Suspense } from "react";
import SubmitButton from "@/components/admin/SubmitButton";
import PageSkeleton from "@/components/PageSkeleton";
import { updatePrices } from "@/lib/admin-actions";
import { requireAdmin } from "@/lib/auth";
import { readDb } from "@/lib/db";
import { estimateByProcesses, formatRange } from "@/lib/estimate";
import { GRADE_LABEL, GRADES, UNIT_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "단가표" };

async function Prices() {
  const { companyId } = await requireAdmin();
  const db = await readDb();
  const items = db.priceItems.filter((p) => p.companyId === companyId).sort((a, b) => a.order - b.order);
  const defaults = items.filter((i) => i.defaultOn).map((i) => i.key);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
      <h1 className="text-2xl font-extrabold">단가표</h1>
      <p className="text-sm text-muted">
        견적 계산기와 미니룸이 이 단가로 계산합니다. 고객에게는 단가가 아니라 ±8% 범위 금액만 보입니다.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {GRADES.map((g) => (
          <div key={g} className="card p-3 text-sm">
            <p className="text-xs text-muted">32평 · {GRADE_LABEL[g]} · 기본 공정</p>
            <p className="font-bold">{formatRange(estimateByProcesses(items, 32, defaults, g))}</p>
          </div>
        ))}
      </div>

      <form action={updatePrices} className="mt-5">
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-paper text-left text-xs text-muted">
              <tr>
                <th className="p-3">공정</th>
                <th className="p-3">단위</th>
                {GRADES.map((g) => (
                  <th key={g} className="p-3">
                    {GRADE_LABEL[g]} (원)
                  </th>
                ))}
                <th className="p-3 text-center">기본 선택</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="p-3">
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-muted">{item.description}</p>
                  </td>
                  <td className="p-3 text-xs whitespace-nowrap text-muted">{UNIT_LABEL[item.unit]}</td>
                  {GRADES.map((g) => (
                    <td key={g} className="p-2">
                      <input
                        name={`${item.id}.${g}`}
                        defaultValue={item.prices[g].toLocaleString("ko-KR")}
                        inputMode="numeric"
                        className="input py-1.5 text-right tabular-nums"
                        aria-label={`${item.name} ${GRADE_LABEL[g]}`}
                      />
                    </td>
                  ))}
                  <td className="p-3 text-center">
                    <input
                      type="checkbox"
                      name={`${item.id}.defaultOn`}
                      defaultChecked={item.defaultOn}
                      className="h-4 w-4 accent-[var(--brand)]"
                      aria-label={`${item.name} 기본 선택`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <SubmitButton>단가표 저장</SubmitButton>
        </div>
      </form>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Prices />
    </Suspense>
  );
}
