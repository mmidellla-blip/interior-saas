import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <p className="text-5xl font-extrabold text-line">404</p>
      <h1 className="mt-3 text-xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="mt-1 text-sm text-muted">주소가 바뀌었거나 공유 링크가 새로 발급되었을 수 있어요.</p>
      <Link href="/" className="btn-outline mt-6">
        처음으로
      </Link>
    </div>
  );
}
