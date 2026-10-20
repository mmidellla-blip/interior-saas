"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "홈", icon: "⌂" },
  { href: "/admin/leads", label: "문의", icon: "✉" },
  { href: "/admin/projects", label: "현장", icon: "▣" },
  { href: "/admin/showrooms", label: "집자랑", icon: "♥" },
  { href: "/admin/prices", label: "단가표", icon: "₩" },
  { href: "/admin/settings", label: "설정", icon: "⚙" },
];

export default function AdminNav({ newLeads }: { newLeads: number }) {
  const pathname = usePathname();
  return (
    <nav className="grid grid-cols-6 md:flex md:flex-col md:gap-0.5">
      {ITEMS.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold md:flex-row md:gap-3 md:rounded-xl md:px-3 md:py-2.5 md:text-sm ${
              active ? "text-brand md:bg-brand-soft" : "text-muted hover:text-ink md:hover:bg-black/5"
            }`}
          >
            <span className="text-lg leading-none md:w-5 md:text-center md:text-base">{item.icon}</span>
            {item.label}
            {item.href === "/admin/leads" && newLeads > 0 && (
              <span className="absolute top-1 right-[22%] rounded-full bg-danger px-1.5 text-[10px] leading-4 text-white md:static md:ml-auto">
                {newLeads}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
