import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import PoweredBy from "@/components/PoweredBy";
import { getCompanyBySlug } from "@/lib/queries";

async function CompanyHeader({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getCompanyBySlug(slug);
  if (!data) notFound();
  const { company } = data;
  const base = `/c/${company.slug}`;
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href={base} className="text-lg font-extrabold tracking-tight">
          {company.name}
        </Link>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link href={`${base}/estimate`} className="btn-ghost px-3 py-2">견적</Link>
          <Link href={`${base}/room`} className="btn-ghost px-3 py-2">꾸며보기</Link>
          <Link href={`${base}/rooms`} className="btn-ghost px-3 py-2">집자랑</Link>
          <Link href={`${base}#portfolio`} className="btn-ghost hidden px-3 py-2 sm:inline-flex">시공사례</Link>
          <a href={`tel:${company.phone}`} className="btn-primary ml-1 px-3 py-2">전화</a>
        </nav>
      </div>
    </header>
  );
}

export default function CompanyLayout({ children, params }: LayoutProps<"/c/[slug]">) {
  return (
    <>
      <Suspense fallback={<div className="h-[61px] border-b border-line" />}>
        <CompanyHeader params={params} />
      </Suspense>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line py-6 text-center">
        <PoweredBy />
      </footer>
    </>
  );
}
