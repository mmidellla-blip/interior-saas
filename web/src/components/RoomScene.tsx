import { buildFurniturePrims, buildRoomModel, WALL_HEIGHT, type Prim, type RoomModel, type V3 } from "@/lib/room-model";
import type { RoomConfig } from "@/lib/types";

/**
 * 아이소메트릭 미니룸 (2D). 장면은 lib/room-model.ts가 정의하고 여기서는 화면 좌표로 투영만 한다.
 * 가구 도형에는 data-item을 달아 두어 RoomDesigner가 끌어서 옮길 수 있다.
 */
const S = 34;
const COS = Math.cos(Math.PI / 6);
const H = WALL_HEIGHT;

function iso([x, y, z]: V3): [number, number] {
  return [(x - y) * COS * S, (x + y) * 0.5 * S - z * S];
}

/** 화면(SVG) 좌표를 바닥(z=0) 위의 방 좌표로 */
export function screenToFloor(sx: number, sy: number): [number, number] {
  const a = sx / (COS * S);
  const b = (2 * sy) / S;
  return [(a + b) / 2, (b - a) / 2];
}

function pts(points: V3[]): string {
  return points.map((p) => iso(p).map((v) => v.toFixed(1)).join(",")).join(" ");
}

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c : 255 - c) * amount)));
  const r = f(n >> 16);
  const g = f((n >> 8) & 255);
  const b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** 위·앞(x+)·옆(y+) 세 면만 보이는 상자 */
function Box({ prim }: { prim: Extract<Prim, { kind: "box" }> }) {
  const [x0, y0, z0] = prim.at;
  const [x1, y1, z1] = [x0 + prim.size[0], y0 + prim.size[1], z0 + prim.size[2]];
  const c = prim.color;
  const opacity = prim.mat === "glass" || prim.mat === "sky" ? 0.85 : 1;
  return (
    <g stroke="rgba(0,0,0,0.12)" strokeWidth={0.6} strokeLinejoin="round" opacity={opacity} filter={prim.emissive ? "url(#soft)" : undefined}>
      <polygon points={pts([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]])} fill={shade(c, prim.emissive ? 0 : -0.18)} />
      <polygon points={pts([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]])} fill={shade(c, prim.emissive ? 0.1 : -0.08)} />
      <polygon points={pts([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} fill={shade(c, 0.12)} />
    </g>
  );
}

function Sphere({ prim }: { prim: Extract<Prim, { kind: "sphere" }> }) {
  const [cx, cy] = iso(prim.center);
  const r = prim.r * S;
  if (prim.emissive) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r * 2.4} fill={prim.color} opacity={0.5} filter="url(#glow)" />
        <circle cx={cx} cy={cy} r={r} fill="#fff6d8" />
      </g>
    );
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={shade(prim.color, -0.1)} />
      <circle cx={cx - r * 0.25} cy={cy - r * 0.3} r={r * 0.62} fill={shade(prim.color, 0.12)} />
    </g>
  );
}

/** 원기둥: 아래 타원(옆면 색) + 옆면 + 위 타원. 원은 아이소메트릭에서 가로로 긴 타원이 된다 */
function Cyl({ prim }: { prim: Extract<Prim, { kind: "cyl" }> }) {
  const [x, y, z] = prim.at;
  const [cx, bottom] = iso([x, y, z]);
  const [, top] = iso([x, y, z + prim.h]);
  const rx = prim.r * Math.SQRT2 * COS * S;
  const ry = prim.r * Math.SQRT2 * 0.5 * S;
  const c = prim.color;
  const side = shade(c, prim.emissive ? 0.05 : -0.14);
  return (
    <g stroke="rgba(0,0,0,0.12)" strokeWidth={0.6} opacity={prim.mat === "glass" || prim.mat === "sky" ? 0.85 : 1}>
      <ellipse cx={cx} cy={bottom} rx={rx} ry={ry} fill={side} />
      <rect x={cx - rx} y={top} width={rx * 2} height={bottom - top} fill={side} stroke="none" />
      <ellipse cx={cx} cy={top} rx={rx} ry={ry} fill={shade(c, prim.emissive ? 0.2 : 0.12)} />
    </g>
  );
}

function Shape({ prim }: { prim: Prim }) {
  if (prim.kind === "box") return <Box prim={prim} />;
  if (prim.kind === "cyl") return <Cyl prim={prim} />;
  return <Sphere prim={prim} />;
}

function Thing({ prim, editable }: { prim: Prim; editable?: boolean }) {
  const body = <Shape prim={prim} />;
  if (prim.item === undefined) return body;
  return (
    <g data-item={prim.item} style={editable ? { cursor: "grab" } : undefined}>
      {body}
    </g>
  );
}

/** 바닥 외곽선. ㄱ자 구조면 앞쪽 모서리가 빠진다 */
function floorOutline({ width: W, depth: D, notch }: RoomModel["size"]): V3[] {
  if (!notch) return [[0, 0, 0], [W, 0, 0], [W, D, 0], [0, D, 0]];
  const [nx, ny] = notch;
  return [[0, 0, 0], [W, 0, 0], [W, ny, 0], [nx, ny, 0], [nx, D, 0], [0, D, 0]];
}

function floorLines(pattern: string, gap: number, { width: W, depth: D, notch }: RoomModel["size"]): string[] {
  // ㄱ자 구조에서 가로줄·세로줄이 어디까지 이어지는지
  const xEnd = (y: number) => (notch && y > notch[1] ? notch[0] : W);
  const yEnd = (x: number) => (notch && x > notch[0] ? notch[1] : D);
  const lines: string[] = [];
  if (pattern === "plank") {
    for (let y = gap; y < D; y += gap) lines.push(pts([[0, y, 0], [xEnd(y), y, 0]]));
  } else if (pattern === "tile") {
    for (let t = gap; t < D; t += gap) lines.push(pts([[0, t, 0], [xEnd(t), t, 0]]));
    for (let t = gap; t < W; t += gap) lines.push(pts([[t, 0, 0], [t, yEnd(t), 0]]));
  } else {
    // 헤링본: 줄마다 지그재그
    for (let y = 0; y < D - 0.01; y += gap) {
      const bottom = Math.min(D, y + gap);
      const end = xEnd(bottom - 0.001);
      const zig: V3[] = [];
      for (let x = 0, up = true; x <= end + 0.001; x += gap / 2, up = !up) zig.push([x, up ? y : bottom, 0]);
      lines.push(pts(zig));
      if (y > 0) lines.push(pts([[0, y, 0], [xEnd(y), y, 0]]));
    }
  }
  return lines;
}

function viewBoxOf(corners: [number, number][], pad: number): string {
  const xs = corners.map((c) => c[0]);
  const ys = corners.map((c) => c[1]);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return `${minX - pad} ${minY - pad} ${Math.max(...xs) - minX + pad * 2} ${Math.max(...ys) - minY + pad * 2}`;
}

export default function RoomScene({
  room,
  className,
  selected,
  editable,
}: {
  room: RoomConfig | unknown;
  className?: string;
  /** 선택된 가구 인덱스: 바닥에 테두리를 그린다 */
  selected?: number | null;
  /** 가구에 잡기 커서를 보여 준다 (끌기 동작은 감싼 쪽에서) */
  editable?: boolean;
}) {
  const model = buildRoomModel(room);
  const { floor, walls, lighting, size } = model;
  const { width: W, depth: D } = size;
  const warm = lighting.mode === "indirect" ? 0.55 : lighting.mode === "downlight" ? 0.3 : 0;
  const viewBox = viewBoxOf([iso([0, D, 0]), iso([W, 0, 0]), iso([0, 0, H]), iso([W, D, 0])], 16);
  const picked = selected != null ? model.furniture[selected] : undefined;

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label="꾸민 미니룸 미리보기">
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
        <radialGradient id="pool">
          <stop offset="0%" stopColor="#ffe3a3" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffe3a3" stopOpacity="0" />
        </radialGradient>
      </defs>

      <polygon points={pts([[0, 0, 0], [0, D, 0], [0, D, H], [0, 0, H]])} fill={walls.left} />
      <polygon points={pts([[0, 0, 0], [W, 0, 0], [W, 0, H], [0, 0, H]])} fill={walls.right} />

      {lighting.glow && (
        <g filter="url(#glow)" opacity={0.9}>
          <polyline points={pts([[0, D, H - 0.15], [0, 0, H - 0.15], [W, 0, H - 0.15]])} fill="none" stroke="#ffcf6b" strokeWidth={9} />
        </g>
      )}

      <polygon points={pts(floorOutline(size))} fill={floor.base} />
      {floorLines(floor.pattern, floor.gap, size).map((d, i) => (
        <polyline key={i} points={d} fill="none" stroke={floor.line} strokeWidth={0.8} />
      ))}

      {warm > 0 &&
        lighting.spots.map(([x, y]) => {
          const [cx, cy] = iso([x, y, 0]);
          return <ellipse key={`${x}-${y}`} cx={cx} cy={cy} rx={70} ry={38} fill="url(#pool)" opacity={warm + 0.2} />;
        })}

      {picked && (
        <polygon
          points={pts([
            [picked.x - 0.1, picked.y - 0.1, 0],
            [picked.x + picked.w + 0.1, picked.y - 0.1, 0],
            [picked.x + picked.w + 0.1, picked.y + picked.d + 0.1, 0],
            [picked.x - 0.1, picked.y + picked.d + 0.1, 0],
          ])}
          fill="var(--brand)"
          fillOpacity={0.18}
          stroke="var(--brand)"
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />
      )}

      {model.prims.map((prim, i) => (
        <Thing key={i} prim={prim} editable={editable} />
      ))}

      {lighting.mode === "downlight" &&
        lighting.spots.map(([x, y]) => {
          const [cx, cy] = iso([x, y, 0]);
          return <ellipse key={`d${x}-${y}`} cx={cx} cy={cy} rx={4} ry={2} fill="#fff7d6" />;
        })}
    </svg>
  );
}

/** 가구 카탈로그의 작은 미리보기 */
export function FurnitureThumb({ type, room, className }: { type: string; room: RoomConfig; className?: string }) {
  const prims = buildFurniturePrims(type, room);
  const corners = prims.flatMap((p): [number, number][] => {
    if (p.kind === "sphere") {
      const [cx, cy] = iso(p.center);
      const r = p.r * S;
      return [
        [cx - r, cy - r],
        [cx + r, cy + r],
      ];
    }
    if (p.kind === "cyl") {
      const [x, y, z] = p.at;
      return [iso([x - p.r, y + p.r, z]), iso([x + p.r, y - p.r, z]), iso([x - p.r, y - p.r, z + p.h]), iso([x + p.r, y + p.r, z])];
    }
    const [x, y, z] = p.at;
    const [w, d, h] = p.size;
    return [iso([x, y + d, z]), iso([x + w, y, z]), iso([x, y, z + h]), iso([x + w, y + d, z])];
  });
  return (
    <svg viewBox={viewBoxOf(corners, 4)} className={className} aria-hidden>
      {prims.map((prim, i) => (
        <Shape key={i} prim={prim} />
      ))}
    </svg>
  );
}
