import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { logout } from "@/lib/admin-actions";
import { readDb } from "@/lib/db";
import AdminNav from "./AdminNav";

async function NavData() {
  const { companyId } = await requireAdmin();
  const db = await readDb();
  const company = db.companies.find((c) => c.id === companyId)!;
  const newLeads = db.leads.filter((l) => l.companyId === companyId && l.status === "new").length;
  return (
    <>
      <div className="hidden items-center justify-between px-3 pb-4 md:flex">
        <Link href="/admin" className="font-extrabold">
          {company.name}
        </Link>
      </div>
      <AdminNav newLeads={newLeads} />
      <div className="mt-auto hidden space-y-1 px-1 md:block">
        <Link href={`/c/${company.slug}`} target="_blank" className="btn-ghost w-full justify-start text-xs">
          내 업체 페이지 보기 ↗
        </Link>
        <form action={logout}>
          <button type="submit" className="btn-ghost w-full justify-start text-xs">
            로그아웃
          </button>
        </form>
      </div>
    </>
  );
}

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface md:sticky md:top-0 md:flex md:h-screen md:w-56 md:flex-col md:border-t-0 md:border-r md:p-3 md:pt-6">
        <Suspense fallback={<div className="h-14" />}>
          <NavData />
        </Suspense>
      </aside>
      <main className="flex-1 pb-24 md:pb-0">{children}</main>
    </div>
  );
}
