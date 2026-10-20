import type { Metadata } from "next";
import Link from "next/link";
import ProjectFields from "@/components/admin/ProjectFields";
import SubmitButton from "@/components/admin/SubmitButton";
import { createProject } from "@/lib/admin-actions";

export const metadata: Metadata = { title: "새 현장" };

export default function Page() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
      <Link href="/admin/projects" className="text-sm text-muted hover:text-brand">
        ← 현장 목록
      </Link>
      <h1 className="mt-2 mb-6 text-2xl font-extrabold">새 현장 등록</h1>
      <form action={createProject} className="card space-y-6 p-5">
        <ProjectFields />
        <SubmitButton pendingText="만드는 중…" className="btn-primary w-full py-3">
          현장 만들고 공유 링크 받기
        </SubmitButton>
      </form>
    </div>
  );
}
