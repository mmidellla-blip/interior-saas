import type { Metadata } from "next";
import { isDevPassword } from "@/lib/auth";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "관리자 로그인", robots: { index: false } };

export default function Page() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="inline-grid h-12 w-12 place-items-center rounded-2xl bg-brand text-lg font-extrabold text-white">
            집
          </span>
          <h1 className="mt-3 text-xl font-extrabold">집공방 관리자</h1>
          <p className="text-sm text-muted">문의·현장·단가표를 관리합니다</p>
        </div>
        <LoginForm />
        {isDevPassword() && (
          <p className="mt-4 rounded-xl bg-wood-soft p-3 text-center text-xs text-wood">
            개발용 비밀번호: <b>demo1234</b> · 운영 시 ADMIN_PASSWORD 환경변수를 설정하세요
          </p>
        )}
      </div>
    </div>
  );
}
