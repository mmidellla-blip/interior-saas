import Link from "next/link";
import type { ShowroomSummary } from "@/lib/queries";
import { findLayout, LAYOUT_KIND_LABEL } from "@/lib/room";
import { MOODS } from "@/lib/types";
import RoomScene from "./RoomScene";

/** 집자랑 갤러리 카드 */
export default function ShowroomCard({ showroom, href }: { showroom: ShowroomSummary; href: string }) {
  const layout = findLayout(showroom.room.layout);
  return (
    <Link href={href} className="card group overflow-hidden transition-shadow hover:shadow-lg">
      <div className="relative bg-gradient-to-b from-[#f4efe6] to-[#ebe4d8] p-3">
        <RoomScene room={showroom.room} className="mx-auto h-44 w-auto transition-transform group-hover:scale-[1.03]" />
        <span className="chip absolute top-3 left-3 bg-white/85 text-muted backdrop-blur">
          {LAYOUT_KIND_LABEL[layout.kind]} · {layout.label}
        </span>
      </div>
      <div className="p-4">
        <h3 className="truncate font-bold group-hover:text-brand">{showroom.title}</h3>
        <p className="mt-0.5 truncate text-xs text-muted">
          {MOODS[showroom.mood].split(" ")[0]} {showroom.nickname}
          {showroom.intro && ` · ${showroom.intro}`}
        </p>
        <p className="mt-2 flex gap-3 text-xs font-semibold text-muted tabular-nums">
          <span className="text-[#e0566b]">♥ {showroom.likes}</span>
          <span>방문 {showroom.visitsTotal}</span>
          <span>방명록 {showroom.guestbookCount}</span>
        </p>
      </div>
    </Link>
  );
}
