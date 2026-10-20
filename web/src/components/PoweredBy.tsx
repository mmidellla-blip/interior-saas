import Link from "next/link";

/** 업체 페이지 하단 표시. 고객이 링크를 다른 업체에 보내면 그대로 홍보가 된다. */
export default function PoweredBy() {
  return (
    <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-brand">
      <span className="grid h-4 w-4 place-items-center rounded bg-brand text-[9px] font-bold text-white">집</span>
      Powered by 집공방 · 수수료 없는 내 고객 관리
    </Link>
  );
}
