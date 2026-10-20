import { findFurniture, findLayout, footprint, normalizeRoom } from "./room";
import type { PlacedFurniture } from "./types";

/**
 * 미니룸 장면 정의. 2D 아이소메트릭(RoomScene)과 3D(Room3D)가 같은 모델을 그려서 두 화면이 항상 일치한다.
 * 좌표: x축은 오른쪽 벽(현관문·주방) 방향, y축은 왼쪽 벽(창·소파) 방향, z는 높이. 방 크기는 구조(layout)마다 다르고 천장 높이 6.
 * 2D는 뒤에서 앞 순서로 그려야 하므로, 벽에 붙은 것은 정의한 순서대로 두고 바닥에 놓인 것은 depthSort로 정렬한다.
 */
export const WALL_HEIGHT = 6;

export type V3 = [number, number, number];
/** sky: 바깥이 보이는 창유리 (3D에서 낮빛처럼 밝게) */
export type Material = "matte" | "gloss" | "wood" | "fabric" | "metal" | "glass" | "leaf" | "sky";

interface PrimBase {
  color: string;
  mat?: Material;
  emissive?: boolean;
  /** 이 도형이 속한 가구의 room.furniture 인덱스 (옮길 수 있는 가구만) */
  item?: number;
  /** 정렬과 상관없이 장면 안에서 변하지 않는 번호 (3D에서 메시를 다시 만들지 않게) */
  key?: number;
}

/**
 * box의 round는 모서리 둥글기(3D만), cyl은 바닥 중심 at에서 위로 h만큼 선 원기둥.
 */
export type Prim =
  | (PrimBase & { kind: "box"; at: V3; size: V3; round?: number })
  | (PrimBase & { kind: "sphere"; center: V3; r: number })
  | (PrimBase & { kind: "cyl"; at: V3; r: number; h: number });

export interface FloorSpec {
  pattern: "plank" | "herringbone" | "tile";
  base: string;
  line: string;
  gap: number;
}

export interface RoomModel {
  size: { width: number; depth: number; notch?: [number, number] };
  floor: FloorSpec;
  walls: { left: string; right: string };
  prims: Prim[];
  /** 가구별 바닥 영역 (선택 표시용), room.furniture와 같은 순서 */
  furniture: { x: number; y: number; w: number; d: number }[];
  lighting: { mode: "flat" | "downlight" | "indirect"; spots: [number, number][]; glow: boolean };
  /** 3D에서 따뜻한 점광원을 둘 위치 (스탠드, 펜던트) */
  lights: V3[];
}

const FLOORS: Record<string, FloorSpec> = {
  laminate: { pattern: "plank", base: "#cfa77c", line: "#b88f63", gap: 0.7 },
  oak: { pattern: "plank", base: "#b5845a", line: "#99693f", gap: 1.1 },
  herringbone: { pattern: "herringbone", base: "#a8754b", line: "#86593a", gap: 0.9 },
  porcelain: { pattern: "tile", base: "#e1ded8", line: "#c9c5bd", gap: 2.5 },
};

const WALLS: Record<string, { left: string; right: string }> = {
  silk: { left: "#f1ece4", right: "#e7e1d7" },
  accent: { left: "#f1ece4", right: "#e7e1d7" },
  sage: { left: "#f1ece4", right: "#e7e1d7" },
  paint: { left: "#ddd6cb", right: "#cfc7bb" },
};

const DOORS: Record<string, { frame: string; leaf: string; base: string | null; crown: boolean }> = {
  white: { frame: "#f4f2ee", leaf: "#f7f6f2", base: "#ffffff", crown: true },
  wood: { frame: "#a87a4f", leaf: "#b98a5e", base: "#a87a4f", crown: true },
  black: { frame: "#262626", leaf: "#e9e6e0", base: null, crown: false },
};

const KITCHENS: Record<string, { door: string; top: string; island: string | null; splash: string }> = {
  basic: { door: "#f7f6f2", top: "#e9e7e2", island: null, splash: "#eeece7" },
  island: { door: "#f4f1ea", top: "#b98a5e", island: "#b98a5e", splash: "#ece8df" },
  stone: { door: "#41584b", top: "#e8e6e1", island: "#41584b", splash: "#d9d4ca" },
};

interface SofaStyle {
  seat: string;
  back: string;
  cushion: string;
  mat: Material;
}

const SOFAS: Record<string, SofaStyle> = {
  sage: { seat: "#8a9a8e", back: "#7d8e82", cushion: "#e9d9bf", mat: "fabric" },
  leather: { seat: "#8b5a3c", back: "#7a4d33", cushion: "#d9c7a6", mat: "gloss" },
  boucle: { seat: "#e6dfd2", back: "#ddd5c6", cushion: "#a9b8a3", mat: "fabric" },
};

const box = (at: V3, size: V3, color: string, mat?: Material, emissive?: boolean): Prim => ({
  kind: "box",
  at,
  size,
  color,
  mat,
  emissive,
});
const sphere = (center: V3, r: number, color: string, mat?: Material, emissive?: boolean): Prim => ({
  kind: "sphere",
  center,
  r,
  color,
  mat,
  emissive,
});
/** 모서리가 둥근 상자 (쿠션·매트리스 등) */
const rbox = (at: V3, size: V3, color: string, mat: Material, round: number): Prim => ({
  kind: "box",
  at,
  size,
  color,
  mat,
  round,
});
/** 원기둥: 바닥 중심 (x, y, z)에서 높이 h */
const cyl = (x: number, y: number, z: number, r: number, h: number, color: string, mat?: Material, emissive?: boolean): Prim => ({
  kind: "cyl",
  at: [x, y, z],
  r,
  h,
  color,
  mat,
  emissive,
});

/** 네 귀퉁이 다리 */
function legs(u0: number, v0: number, u1: number, v1: number, h: number, r: number, color: string, mat: Material): Prim[] {
  return [
    [u0, v0],
    [u1, v0],
    [u0, v1],
    [u1, v1],
  ].map(([u, v]) => cyl(u, v, 0, r, h, color, mat));
}

function plant(x: number, y: number, scale = 1): Prim[] {
  return [
    cyl(x, y, 0, 0.26 * scale, 0.6 * scale, "#e7d3bd", "matte"),
    sphere([x, y, 1.0 * scale], 0.45 * scale, "#4f8a55", "leaf"),
    sphere([x + 0.15 * scale, y - 0.1 * scale, 1.45 * scale], 0.3 * scale, "#6aa564", "leaf"),
  ];
}

/** 같은 색의 밝기만 바꾼 hex (이음매·그늘용) */
function tintHex(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount < 0 ? c : 255 - c) * amount)));
  return `#${((f(n >> 16) << 16) | (f((n >> 8) & 255) << 8) | f(n & 255)).toString(16).padStart(6, "0")}`;
}

const BOOKS = ["#7d5a44", "#c8a27a", "#41584b", "#d9c7a6", "#8a9a8e", "#b4442f"];

/**
 * 가구 하나를 자기 좌표계로 그린다. u는 벽에서 앞쪽(깊이), v는 벽을 따라가는 방향.
 * 회전 0이면 등받이가 왼쪽 벽(x=0)에 붙고 +x 쪽을 바라본다.
 */
function furnitureShapes(type: string, sofa: SofaStyle, glow: boolean): Prim[] {
  switch (type) {
    case "sofa":
      return [
        ...legs(0.15, 0.2, 1.45, 4.2, 0.25, 0.05, "#5a4632", "wood"),
        rbox([0, 0, 0.25], [1.6, 4.4, 0.4], sofa.back, sofa.mat, 0.08),
        rbox([0, 0, 0.6], [0.55, 4.4, 1.35], sofa.back, sofa.mat, 0.14),
        rbox([0.5, 0.45, 0.65], [1.1, 1.74, 0.36], sofa.seat, sofa.mat, 0.14),
        rbox([0.5, 2.21, 0.65], [1.1, 1.74, 0.36], sofa.seat, sofa.mat, 0.14),
        rbox([0.45, 0.5, 1.0], [0.32, 1.66, 0.85], sofa.seat, sofa.mat, 0.15),
        rbox([0.45, 2.24, 1.0], [0.32, 1.66, 0.85], sofa.seat, sofa.mat, 0.15),
        rbox([0.4, 0, 0.6], [1.2, 0.45, 0.65], sofa.back, sofa.mat, 0.14),
        rbox([0.4, 3.95, 0.6], [1.2, 0.45, 0.65], sofa.back, sofa.mat, 0.14),
        rbox([0.8, 0.75, 1.01], [0.26, 0.75, 0.65], sofa.cushion, "fabric", 0.12),
        rbox([0.8, 2.95, 1.01], [0.26, 0.7, 0.6], "#c98a5a", "fabric", 0.12),
        rbox([0.95, 1.9, 1.01], [0.6, 0.9, 0.05], "#efe6d6", "fabric", 0.02),
      ];
    case "armchair":
      return [
        ...legs(0.25, 0.25, 1.35, 1.25, 0.25, 0.05, "#5a4632", "wood"),
        rbox([0.1, 0.1, 0.25], [1.4, 1.3, 0.4], sofa.back, sofa.mat, 0.08),
        rbox([0.1, 0.1, 0.6], [0.5, 1.3, 1.3], sofa.back, sofa.mat, 0.14),
        rbox([0.5, 0.4, 0.65], [0.95, 0.7, 0.32], sofa.seat, sofa.mat, 0.12),
        rbox([0.45, 0.1, 0.6], [1.05, 0.3, 0.55], sofa.back, sofa.mat, 0.12),
        rbox([0.45, 1.1, 0.6], [1.05, 0.3, 0.55], sofa.back, sofa.mat, 0.12),
        rbox([0.6, 0.5, 0.97], [0.28, 0.5, 0.55], sofa.cushion, "fabric", 0.12),
      ];
    case "coffee":
      return [
        ...legs(0.12, 0.12, 1.48, 1.48, 0.5, 0.05, "#9d7a55", "wood"),
        rbox([0.1, 0.1, 0.16], [1.4, 1.4, 0.05], "#b8946c", "wood", 0.02),
        rbox([0, 0, 0.5], [1.6, 1.6, 0.1], "#c4a27f", "wood", 0.04),
        rbox([0.35, 0.35, 0.6], [0.55, 0.4, 0.08], "#efe6d6", "matte", 0.02),
        cyl(1.1, 1.1, 0.6, 0.12, 0.3, "#f1ece4", "gloss"),
        sphere([1.1, 1.1, 1.0], 0.13, "#7fa36f", "leaf"),
      ];
    case "side":
      return [
        cyl(0.4, 0.4, 0, 0.26, 0.04, "#3a3a3a", "metal"),
        cyl(0.4, 0.4, 0.04, 0.04, 0.96, "#3a3a3a", "metal"),
        cyl(0.4, 0.4, 1.0, 0.38, 0.06, "#c4a27f", "wood"),
        cyl(0.35, 0.4, 1.06, 0.09, 0.16, "#e8e3d8", "gloss"),
      ];
    case "rug":
      return [
        box([0, 0, 0], [3.1, 4.2, 0.03], "#e8dcc6", "fabric"),
        box([0.25, 0.25, 0.03], [2.6, 3.7, 0.005], "#ddcdb0", "fabric"),
      ];
    case "tv":
      return [
        cyl(0.15, 0.2, 0, 0.04, 0.15, "#3a3a3a", "metal"),
        cyl(0.65, 0.2, 0, 0.04, 0.15, "#3a3a3a", "metal"),
        cyl(0.15, 3.4, 0, 0.04, 0.15, "#3a3a3a", "metal"),
        cyl(0.65, 3.4, 0, 0.04, 0.15, "#3a3a3a", "metal"),
        rbox([0, 0, 0.15], [0.8, 3.6, 0.65], "#c4a27f", "wood", 0.04),
        rbox([0.8, 0.1, 0.25], [0.01, 1.7, 0.45], "#b08a62", "wood", 0.005),
        rbox([0.8, 1.9, 0.25], [0.01, 1.6, 0.45], "#b08a62", "wood", 0.005),
        rbox([0.2, 1.55, 0.8], [0.3, 0.5, 0.05], "#3a3a3a", "metal", 0.02),
        rbox([0.3, 1.75, 0.85], [0.06, 0.1, 0.25], "#3a3a3a", "metal", 0.01),
        rbox([0.26, 0.3, 1.05], [0.07, 3.0, 1.7], "#1e1f22", "gloss", 0.03),
      ];
    case "bookcase": {
      const prims = [
        box([0, 0, 0], [0.15, 1.8, 3.6], "#b08a62", "wood"),
        box([0.15, 0, 0], [0.65, 0.08, 3.6], "#c4a27f", "wood"),
        box([0.15, 1.72, 0], [0.65, 0.08, 3.6], "#c4a27f", "wood"),
      ];
      for (const [row, z] of [0, 1.2, 2.4].entries()) {
        prims.push(box([0.15, 0.08, z], [0.65, 1.64, 0.1], "#c4a27f", "wood"));
        for (let i = 0; i < 5; i++) {
          const h = 0.6 + ((i + row) % 3) * 0.15;
          prims.push(box([0.25, 0.15 + i * 0.3, z + 0.1], [0.45, 0.24, h], BOOKS[(i + row * 2) % BOOKS.length], "matte"));
        }
      }
      prims.push(box([0.15, 0.08, 3.5], [0.65, 1.64, 0.1], "#c4a27f", "wood"));
      return prims;
    }
    case "dining": {
      const prims = [
        ...legs(0.62, 0.22, 1.78, 2.38, 1.35, 0.06, "#9d8466", "wood"),
        rbox([0.5, 0.1, 1.35], [1.4, 2.4, 0.1], "#d8c3a5", "wood", 0.04),
        cyl(1.2, 1.3, 1.45, 0.14, 0.32, "#e8e3d8", "gloss"),
      ];
      for (const v of [0.5, 1.6]) {
        for (const [u, back] of [
          [0, 0],
          [1.9, 0.42],
        ]) {
          prims.push(...legs(u + 0.06, v + 0.06, u + 0.44, v + 0.44, 0.8, 0.035, "#9d8466", "wood"));
          prims.push(rbox([u, v, 0.8], [0.5, 0.5, 0.08], "#c4a27f", "wood", 0.03));
          prims.push(rbox([u + back, v, 0.88], [0.08, 0.5, 0.8], "#c4a27f", "wood", 0.03));
        }
      }
      return prims;
    }
    case "bed":
      return [
        ...legs(0.15, 0.15, 4.05, 3.05, 0.2, 0.06, "#8b6a48", "wood"),
        rbox([0, 0, 0.2], [4.2, 3.2, 0.4], "#c4a27f", "wood", 0.06),
        rbox([0, 0, 0.2], [0.25, 3.2, 1.9], "#b08a62", "wood", 0.08),
        rbox([0.25, 0.1, 0.6], [3.85, 3.0, 0.45], "#f5f2ec", "fabric", 0.15),
        rbox([0.4, 0.3, 1.05], [0.65, 1.15, 0.28], "#ffffff", "fabric", 0.13),
        rbox([0.4, 1.75, 1.05], [0.65, 1.15, 0.28], "#ffffff", "fabric", 0.13),
        rbox([1.6, 0.02, 1.0], [2.6, 3.16, 0.14], sofa.seat, "fabric", 0.06),
        rbox([1.4, 0.02, 1.08], [0.35, 3.16, 0.12], sofa.cushion, "fabric", 0.05),
      ];
    case "desk":
      return [
        ...legs(0.08, 0.08, 0.92, 2.32, 1.35, 0.04, "#3a3a3a", "metal"),
        rbox([0, 0, 1.35], [1.0, 2.4, 0.08], "#f1ece4", "matte", 0.03),
        rbox([0.2, 1.1, 1.43], [0.25, 0.2, 0.04], "#3a3a3a", "metal", 0.02),
        cyl(0.3, 1.2, 1.47, 0.03, 0.3, "#3a3a3a", "metal"),
        rbox([0.22, 0.8, 1.75], [0.06, 0.8, 0.55], "#1e1f22", "gloss", 0.02),
        rbox([0.5, 0.95, 1.43], [0.25, 0.6, 0.03], "#e8e3d8", "matte", 0.01),
        cyl(1.53, 1.23, 0, 0.3, 0.06, "#3a3a3a", "metal"),
        cyl(1.53, 1.23, 0.06, 0.05, 0.64, "#3a3a3a", "metal"),
        rbox([1.25, 0.95, 0.7], [0.55, 0.55, 0.15], "#3a3a3a", "fabric", 0.06),
        rbox([1.7, 0.95, 0.85], [0.12, 0.55, 0.85], "#3a3a3a", "fabric", 0.05),
      ];
    case "lamp":
      return [
        cyl(0.3, 0.3, 0, 0.25, 0.06, "#3a3a3a", "metal"),
        cyl(0.3, 0.3, 0.06, 0.03, 3.2, "#3a3a3a", "metal"),
        cyl(0.3, 0.3, 3.2, 0.3, 0.55, "#f3ead8", "fabric", glow),
      ];
    case "plant":
      return plant(0.3, 0.3);
    case "minime":
      return [
        rbox([0.2, 0.12, 0], [0.2, 0.15, 0.5], "#3b4a6b", "fabric", 0.06),
        rbox([0.2, 0.33, 0], [0.2, 0.15, 0.5], "#3b4a6b", "fabric", 0.06),
        rbox([0.15, 0.08, 0.5], [0.3, 0.44, 0.6], "#e86f6f", "fabric", 0.1),
        sphere([0.22, 0.3, 1.6], 0.36, "#3b2a20", "matte"),
        sphere([0.3, 0.3, 1.45], 0.38, "#ffe0c4", "matte"),
        sphere([0.66, 0.2, 1.5], 0.04, "#222222", "gloss"),
        sphere([0.66, 0.4, 1.5], 0.04, "#222222", "gloss"),
      ];
    case "wardrobe":
      return [
        box([0, 0, 0], [1.2, 2.4, 5.0], "#efe6d6", "matte"),
        box([1.2, 1.19, 0.2], [0.01, 0.02, 4.6], "#c4a27f", "wood"),
        box([1.2, 1.02, 2.3], [0.04, 0.04, 0.6], "#9a9a9a", "metal"),
        box([1.2, 1.34, 2.3], [0.04, 0.04, 0.6], "#9a9a9a", "metal"),
      ];
    case "cafetable": {
      const prims = [
        cyl(1.1, 0.5, 0, 0.3, 0.04, "#3a3a3a", "metal"),
        cyl(1.1, 0.5, 0.04, 0.05, 1.26, "#3a3a3a", "metal"),
        cyl(1.1, 0.5, 1.3, 0.48, 0.06, "#f1ece4", "gloss"),
        cyl(1.0, 0.4, 1.36, 0.08, 0.14, "#ffffff", "gloss"),
      ];
      for (const [u, back] of [
        [0, 0],
        [1.7, 0.42],
      ]) {
        prims.push(...legs(u + 0.06, 0.31, u + 0.44, 0.69, 0.8, 0.03, "#3a3a3a", "metal"));
        prims.push(rbox([u, 0.25, 0.8], [0.5, 0.5, 0.08], "#c4a27f", "wood", 0.03));
        prims.push(rbox([u + back, 0.25, 0.88], [0.08, 0.5, 0.75], "#c4a27f", "wood", 0.03));
      }
      return prims;
    }
    case "counter":
      return [
        box([0.1, 0, 0], [1.0, 3.0, 1.9], "#c4a27f", "wood"),
        box([1.1, 0.1, 0.2], [0.05, 2.8, 1.4], "#b08a62", "wood"),
        box([0, 0, 1.9], [1.2, 3.0, 0.1], "#f1ece4", "gloss"),
        box([0.3, 0.4, 2.0], [0.4, 0.5, 0.3], "#2a2a2a", "gloss"),
        box([0.25, 0.45, 2.3], [0.08, 0.4, 0.35], "#1e1f22", "gloss"),
        box([0.2, 2.0, 2.0], [0.6, 0.7, 0.8], "#9a9a9a", "metal"),
      ];
    case "showcase": {
      const drinks = ["#c0392b", "#f1c40f", "#27ae60", "#3b6fb6", "#e67e22"];
      const prims = [
        box([0, 0, 0], [0.1, 2.0, 4.2], "#f4f2ee", "gloss"),
        box([0.1, 0, 0], [0.9, 0.08, 4.2], "#f4f2ee", "gloss"),
        box([0.1, 1.92, 0], [0.9, 0.08, 4.2], "#f4f2ee", "gloss"),
        box([0.1, 0.08, 0], [0.9, 1.84, 0.6], "#f4f2ee", "gloss"),
        box([0.1, 0.08, 3.8], [0.9, 1.84, 0.4], "#c0392b", "gloss", true),
      ];
      for (const [row, z] of [0.6, 1.7, 2.8].entries()) {
        if (row > 0) prims.push(box([0.1, 0.08, z - 0.06], [0.9, 1.84, 0.06], "#e8e3d8", "glass"));
        for (let i = 0; i < 5; i++) prims.push(box([0.35, 0.2 + i * 0.33, z], [0.22, 0.22, 0.7], drinks[(i + row) % drinks.length], "gloss"));
      }
      return prims;
    }
    case "display": {
      const goods = ["#e86f6f", "#f3ead8", "#8a9a8e", "#3b4a6b", "#d9c7a6"];
      const prims = [box([0, 0, 0], [0.12, 2.4, 3.2], "#e8e3d8", "matte")];
      for (const [row, z] of [0, 1.0, 2.0].entries()) {
        prims.push(box([0.12, 0, z], [0.78, 2.4, 0.08], "#f1ece4", "matte"));
        for (let i = 0; i < 5; i++) {
          const h = 0.35 + ((i + row) % 3) * 0.12;
          prims.push(box([0.3, 0.15 + i * 0.45, z + 0.08], [0.4, 0.32, h], goods[(i + row * 2) % goods.length], "matte"));
        }
      }
      prims.push(box([0.12, 0, 3.0], [0.78, 2.4, 0.08], "#f1ece4", "matte"));
      return prims;
    }
    case "rack": {
      const clothes = ["#e9d9bf", "#3b4a6b", "#e86f6f", "#8a9a8e", "#2d2d2d", "#c98a5a", "#f3ead8"];
      const prims = [
        box([0.35, 0.05, 0], [0.1, 0.1, 3.4], "#3a3a3a", "metal"),
        box([0.35, 2.25, 0], [0.1, 0.1, 3.4], "#3a3a3a", "metal"),
        box([0.1, 0, 0], [0.6, 0.2, 0.06], "#3a3a3a", "metal"),
        box([0.1, 2.2, 0], [0.6, 0.2, 0.06], "#3a3a3a", "metal"),
      ];
      for (let i = 0; i < 6; i++) prims.push(box([0.15, 0.3 + i * 0.31, 1.4], [0.5, 0.24, 1.8], clothes[i % clothes.length], "fabric"));
      prims.push(box([0.37, 0.05, 3.3], [0.06, 2.3, 0.06], "#3a3a3a", "metal"));
      return prims;
    }
    case "salonchair":
      return [
        box([0, 0, 0], [0.5, 1.4, 1.4], "#f1ece4", "gloss"),
        box([0, 0.1, 1.55], [0.04, 1.2, 2.3], "#2d2d2d", "metal"),
        box([0.04, 0.15, 1.6], [0.03, 1.1, 2.2], "#cfe3ec", "glass"),
        cyl(1.25, 0.7, 0, 0.3, 0.06, "#3a3a3a", "metal"),
        cyl(1.25, 0.7, 0.06, 0.07, 0.64, "#3a3a3a", "metal"),
        rbox([0.95, 0.4, 0.7], [0.6, 0.6, 0.3], "#2d2d2d", "gloss", 0.08),
        rbox([1.5, 0.4, 1.0], [0.12, 0.6, 1.0], "#2d2d2d", "gloss", 0.05),
      ];
    case "meeting": {
      const prims = [
        box([1.1, 0.8, 0], [0.4, 0.2, 1.35], "#3a3a3a", "metal"),
        box([1.1, 3.0, 0], [0.4, 0.2, 1.35], "#3a3a3a", "metal"),
        box([0.55, 0.3, 1.35], [1.5, 3.4, 0.12], "#f1ece4", "matte"),
      ];
      for (const v of [0.55, 1.75, 2.95]) {
        for (const [u, back] of [
          [0, 0],
          [2.1, 0.4],
        ]) {
          prims.push(cyl(u + 0.25, v + 0.25, 0, 0.05, 0.7, "#3a3a3a", "metal"));
          prims.push(rbox([u, v, 0.7], [0.5, 0.5, 0.15], "#3a3a3a", "fabric", 0.06));
          prims.push(rbox([u + back, v, 0.85], [0.1, 0.5, 0.8], "#3a3a3a", "fabric", 0.04));
        }
      }
      return prims;
    }
    case "menuboard": {
      const prims = [box([0.1, 0, 0], [0.4, 1.0, 2.2], "#2d2d2d", "matte")];
      for (let i = 0; i < 4; i++) prims.push(box([0.5, 0.15, 0.5 + i * 0.4], [0.01, i === 3 ? 0.5 : 0.7, 0.06], "#f1ece4", "matte"));
      return prims;
    }
    case "dog":
      return [
        ...[0.2, 0.7].flatMap((u) => [0.12, 0.38].map((v) => box([u, v, 0], [0.1, 0.1, 0.3], "#b8763f", "fabric"))),
        box([0, 0.27, 0.6], [0.12, 0.06, 0.3], "#c98a5a", "fabric"),
        box([0.1, 0.08, 0.3], [0.8, 0.44, 0.4], "#c98a5a", "fabric"),
        sphere([0.9, 0.12, 1.0], 0.1, "#8b5a3c", "fabric"),
        sphere([0.95, 0.3, 0.85], 0.25, "#c98a5a", "fabric"),
        sphere([0.9, 0.48, 1.0], 0.1, "#8b5a3c", "fabric"),
        sphere([1.18, 0.3, 0.8], 0.05, "#222222", "gloss"),
      ];
    case "cat":
      return [
        box([0, 0.2, 0], [0.3, 0.08, 0.08], "#e9a35b", "fabric"),
        sphere([0.35, 0.25, 0.32], 0.3, "#e9a35b", "fabric"),
        box([0.48, 0.1, 0.92], [0.1, 0.1, 0.16], "#d18a43", "fabric"),
        box([0.48, 0.3, 0.92], [0.1, 0.1, 0.16], "#d18a43", "fabric"),
        sphere([0.55, 0.25, 0.78], 0.22, "#e9a35b", "fabric"),
        sphere([0.75, 0.18, 0.82], 0.03, "#222222", "gloss"),
        sphere([0.75, 0.32, 0.82], 0.03, "#222222", "gloss"),
      ];
    case "bear":
      return [
        sphere([0.35, 0.35, 0.4], 0.35, "#b0814f", "fabric"),
        box([0.55, 0.25, 0.62], [0.1, 0.2, 0.1], "#c0392b", "fabric"),
        sphere([0.35, 0.13, 1.18], 0.1, "#9c6d3e", "fabric"),
        sphere([0.4, 0.35, 0.95], 0.27, "#b0814f", "fabric"),
        sphere([0.35, 0.57, 1.18], 0.1, "#9c6d3e", "fabric"),
        sphere([0.62, 0.35, 0.9], 0.1, "#e3c9a5", "fabric"),
        sphere([0.7, 0.35, 0.95], 0.04, "#222222", "gloss"),
      ];
    case "tree":
      return [
        cyl(0.6, 0.6, 0, 0.28, 0.5, "#b4442f", "matte"),
        cyl(0.6, 0.6, 0.5, 0.06, 0.4, "#7d5a44", "wood"),
        sphere([0.6, 0.6, 1.3], 0.55, "#2f6b3c", "leaf"),
        sphere([0.6, 0.6, 2.0], 0.42, "#357a44", "leaf"),
        sphere([0.6, 0.6, 2.6], 0.3, "#3d8a4d", "leaf"),
        sphere([1.0, 0.7, 1.3], 0.07, "#c0392b", "gloss"),
        sphere([0.7, 1.05, 1.6], 0.07, "#ffd680", "gloss"),
        sphere([0.95, 0.85, 2.1], 0.07, "#3b6fb6", "gloss"),
        sphere([0.6, 0.6, 3.0], 0.12, "#ffd680", "glass", true),
      ];
    case "piano":
      return [
        box([0, 0, 0], [0.7, 2.8, 2.6], "#1e1f22", "gloss"),
        box([0.7, 0.15, 1.4], [0.5, 2.5, 0.15], "#1e1f22", "gloss"),
        box([0.75, 0.2, 1.55], [0.4, 2.4, 0.03], "#f7f6f2", "gloss"),
        box([1.1, 0.9, 0], [0.4, 1.0, 0.9], "#1e1f22", "gloss"),
      ];
    case "fishtank":
      return [
        box([0, 0, 0], [0.8, 2.0, 1.4], "#3a3a3a", "matte"),
        box([0.05, 0.05, 1.4], [0.7, 1.9, 1.2], "#7fc4d9", "glass"),
        sphere([0.3, 1.6, 1.6], 0.15, "#4f8a55", "leaf"),
        sphere([0.5, 0.6, 1.9], 0.08, "#ff8a3d", "gloss"),
        sphere([0.4, 1.3, 2.2], 0.08, "#ffd680", "gloss"),
      ];
    default:
      return [];
  }
}

/** 자기 좌표계로 그린 가구를 회전시켜 방 안 위치로 옮긴다 */
function placeShapes(prims: Prim[], item: PlacedFurniture, index: number): Prim[] {
  const [w, d] = findFurniture(item.type)?.size ?? [1, 1];
  const turn = (u: number, v: number): [number, number] => {
    const [x, y] = item.rot === 1 ? [d - v, u] : item.rot === 2 ? [w - u, d - v] : item.rot === 3 ? [v, w - u] : [u, v];
    return [x + item.x, y + item.y];
  };
  return prims.map((p) => {
    if (p.kind === "sphere") {
      const [x, y] = turn(p.center[0], p.center[1]);
      return { ...p, center: [x, y, p.center[2]], item: index };
    }
    if (p.kind === "cyl") {
      const [x, y] = turn(p.at[0], p.at[1]);
      return { ...p, at: [x, y, p.at[2]], item: index };
    }
    const [ax, ay] = turn(p.at[0], p.at[1]);
    const [bx, by] = turn(p.at[0] + p.size[0], p.at[1] + p.size[1]);
    return {
      ...p,
      at: [Math.min(ax, bx), Math.min(ay, by), p.at[2]],
      size: [Math.abs(bx - ax), Math.abs(by - ay), p.size[2]],
      item: index,
    };
  });
}

/** 카탈로그 미리보기용: 회전 0인 가구 하나 */
export function buildFurniturePrims(type: string, input: unknown): Prim[] {
  const room = normalizeRoom(input);
  return furnitureShapes(type, SOFAS[room.sofa], room.lighting !== "flat");
}

// ── 깊이 정렬 ─────────────────────────────────────────
type Bounds = [number, number, number, number, number, number];

function bounds(p: Prim): Bounds {
  if (p.kind === "sphere") {
    const [x, y, z] = p.center;
    return [x - p.r, y - p.r, z - p.r, x + p.r, y + p.r, z + p.r];
  }
  if (p.kind === "cyl") {
    const [x, y, z] = p.at;
    return [x - p.r, y - p.r, z, x + p.r, y + p.r, z + p.h];
  }
  return [p.at[0], p.at[1], p.at[2], p.at[0] + p.size[0], p.at[1] + p.size[1], p.at[2] + p.size[2]];
}

/** 화면에 투영했을 때의 사각 범위 (방향만 맞으면 되므로 축척 없이) */
function screenRect([x0, y0, z0, x1, y1, z1]: Bounds): [number, number, number, number] {
  const c = Math.cos(Math.PI / 6);
  return [(x0 - y1) * c, (x0 + y0) / 2 - z1, (x1 - y0) * c, (x1 + y1) / 2 - z0];
}

/** a가 b보다 먼저(뒤에) 그려져야 하면 음수. 한 축으로 떨어져 있으면 그 축으로 판단한다 */
function compareDepth(a: Bounds, b: Bounds, pa: Prim, pb: Prim): number {
  const eps = 1e-6;
  for (let axis = 0; axis < 3; axis++) {
    if (a[axis + 3] <= b[axis] + eps) return -1;
    if (b[axis + 3] <= a[axis] + eps) return 1;
  }
  // 겹친 구(미니미 머리·머리카락 등)는 중심이 앞에 있는 쪽을 나중에
  if (pa.kind === "sphere" && pb.kind === "sphere") {
    return pa.center[0] + pa.center[1] - (pb.center[0] + pb.center[1]);
  }
  return 0;
}

/** 화면에서 겹치는 것끼리만 앞뒤를 정해 위상 정렬한다. 정할 수 없으면 원래 순서를 따른다 */
function depthSort(prims: Prim[]): Prim[] {
  const n = prims.length;
  const b = prims.map(bounds);
  const r = b.map(screenRect);
  const next: number[][] = prims.map(() => []);
  const waiting = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (r[i][0] >= r[j][2] || r[j][0] >= r[i][2] || r[i][1] >= r[j][3] || r[j][1] >= r[i][3]) continue;
      const c = compareDepth(b[i], b[j], prims[i], prims[j]);
      if (c < 0) {
        next[i].push(j);
        waiting[j]++;
      } else if (c > 0) {
        next[j].push(i);
        waiting[i]++;
      }
    }
  }
  const done = new Array<boolean>(n).fill(false);
  const sorted: Prim[] = [];
  for (let k = 0; k < n; k++) {
    let pick = -1;
    for (let i = 0; i < n; i++) {
      if (!done[i] && waiting[i] <= 0) {
        pick = i;
        break;
      }
    }
    // 순환이 생기면 남은 것 중 가장 앞 순서부터
    if (pick < 0) pick = done.indexOf(false);
    done[pick] = true;
    sorted.push(prims[pick]);
    for (const j of next[pick]) waiting[j]--;
  }
  return sorted;
}

export function buildRoomModel(input: unknown): RoomModel {
  const room = normalizeRoom(input);
  const layout = findLayout(room.layout);
  const W = layout.width;
  const D = layout.depth;
  const has = (id: string) => room.addons.includes(id);
  const door = DOORS[room.door];
  const kitchen = KITCHENS[room.kitchen];
  const sofa = SOFAS[room.sofa];
  const glow = room.lighting !== "flat";
  const back: Prim[] = [];
  const flat: Prim[] = [];
  const standing: Prim[] = [];
  const lights: V3[] = [];
  const H = WALL_HEIGHT;

  // ── 벽에 붙은 것 (가장 뒤) ──────────────────────────
  if (room.wall === "accent") {
    back.push(box([0, 3.6, 0], [0.04, D - 4.8, H], "#cfb48d", "wood"));
    for (let y = 3.75; y + 0.14 <= D - 1.25; y += 0.28) back.push(box([0.04, y, 0], [0.1, 0.14, H], "#c2a47a", "wood"));
  } else if (room.wall === "sage") {
    back.push(box([0, 3.6, 0], [0.03, D - 4.8, H], "#a9b8a3", "matte"));
  }

  // 걸레받이, 천장 몰딩
  if (door.base) {
    back.push(box([0, 0, 0], [0.07, D, 0.28], door.base, "matte"));
    back.push(box([0, 0, 0], [W, 0.07, 0.28], door.base, "matte"));
  } else {
    // 무몰딩: 바닥과 벽 사이 얇은 그림자 줄눈
    back.push(box([0, 0, 0], [0.03, D, 0.06], "#5a5a5a", "matte"));
    back.push(box([0, 0, 0], [W, 0.03, 0.06], "#5a5a5a", "matte"));
  }
  if (door.crown) {
    back.push(box([0, 0, H - 0.2], [0.12, D, 0.2], door.base ?? "#fff", "matte"));
    back.push(box([0, 0, H - 0.2], [W, 0.12, 0.2], door.base ?? "#fff", "matte"));
  }

  // 창문 (왼쪽 벽): 유리 + 창틀
  back.push(box([0, 0.8, 2], [0.03, 2.2, 2.8], "#cfe3ec", "sky"));
  back.push(box([0, 0.75, 1.95], [0.08, 2.3, 0.1], "#ffffff", "matte"));
  back.push(box([0, 0.75, 4.75], [0.08, 2.3, 0.1], "#ffffff", "matte"));
  back.push(box([0, 0.75, 1.95], [0.08, 0.1, 2.9], "#ffffff", "matte"));
  back.push(box([0, 2.95, 1.95], [0.08, 0.1, 2.9], "#ffffff", "matte"));
  back.push(box([0, 1.85, 1.95], [0.07, 0.08, 2.9], "#ffffff", "matte"));

  // 창 꾸미기
  if (room.window === "blind") {
    for (let z = 2.05; z < 4.75; z += 0.22) back.push(box([0.06, 0.8, z], [0.12, 2.2, 0.05], "#c49a6c", "wood"));
  } else if (room.window === "linen" || room.window === "motor") {
    const motor = room.window === "motor";
    const color = motor ? "#6f7c86" : "#eee6d8";
    if (motor) back.push(box([0, 0, H - 0.45], [0.55, 3.9, 0.45], "#f4f2ee", "matte"));
    else back.push(box([0.2, 0.1, 5.6], [0.06, 3.6, 0.06], "#9a9a9a", "metal"));
    back.push(box([0.06, motor ? 0.15 : 0.3, 0.1], [0.32, motor ? 0.85 : 0.6, 5.45], color, "fabric"));
    back.push(box([0.06, motor ? 2.85 : 2.9, 0.1], [0.32, motor ? 0.85 : 0.6, 5.45], color, "fabric"));
  }

  // 벽 액자 (포인트 벽이 아닐 때)
  if (room.wall !== "accent") {
    const fy = D * 0.54;
    back.push(box([0, fy, 3.0], [0.07, 2.0, 1.4], "#3b3b3b", "matte"));
    back.push(box([0.07, fy + 0.1, 3.1], [0.01, 1.8, 1.2], "#e8d6bd", "matte"));
    back.push(sphere([0.09, fy + 0.8, 3.7], 0.32, "#c98a5a", "matte"));
  }

  // 주방 위치 (오른쪽 벽 끝, 방이 좁으면 짧아진다). 쇼윈도가 주방 앞에서 끝나야 해서 먼저 계산한다
  const hasKitchen = layout.kitchen !== false;
  const kx = Math.max(4.5, W - 5.5);
  const fx = W - 1.2;
  const glassFront = layout.front === "glass";

  // 현관문 (오른쪽 벽). 상가는 유리문
  if (glassFront) {
    const ex = hasKitchen ? kx - 0.3 : Math.min(W - 1, 8.5);
    const frame = "#2d2d2d";
    back.push(box([2.3, 0, 0.3], [ex - 2.3, 0.03, 4.6], "#cfe3ec", "sky"));
    back.push(box([2.25, 0, 0], [ex - 2.2, 0.1, 0.3], frame, "metal"));
    back.push(box([2.25, 0, 4.9], [ex - 2.2, 0.1, 0.15], frame, "metal"));
    for (let x = 2.25; x <= ex; x += Math.max(1.4, (ex - 2.25) / Math.round((ex - 2.25) / 1.8))) {
      back.push(box([x, 0, 0.3], [0.08, 0.1, 4.6], frame, "metal"));
    }
  }
  back.push(box([0.5, 0, 0], [0.12, 0.14, 3.75], door.frame, "matte"));
  back.push(box([2.0, 0, 0], [0.12, 0.14, 3.75], door.frame, "matte"));
  back.push(box([0.5, 0, 3.63], [1.62, 0.14, 0.12], door.frame, "matte"));
  back.push(box([0.62, 0, 0], [1.38, 0.06, 3.63], glassFront ? "#cfe3ec" : door.leaf, glassFront ? "sky" : room.door === "black" ? "glass" : "matte"));
  if (room.door === "black" || glassFront) {
    for (const z of [1.2, 2.4]) back.push(box([0.62, 0.06, z], [1.38, 0.02, 0.05], "#262626", "metal"));
  }
  back.push(sphere([1.8, 0.12, 1.7], 0.07, "#8f8f8f", "metal"));

  // 벽 선반 (추가 항목)
  if (has("shelf")) {
    // 상가는 오른쪽 벽이 쇼윈도라 왼쪽 벽 앞쪽에 단다: 벽을 따라가는 축과 벽에서 나오는 축을 맞바꾼다
    const along = glassFront ? D - 3.5 - 2.5 : 0;
    const at = (x: number, y: number, z: number): V3 => (glassFront ? [y, x + along, z] : [x, y, z]);
    const shelfBox = (x: number, y: number, z: number, w: number, d: number, h: number, color: string, mat: Material) =>
      box(at(x, y, z), glassFront ? [d, w, h] : [w, d, h], color, mat);
    for (const [row, z] of [2.4, 3.3, 4.2].entries()) {
      back.push(shelfBox(2.5, 0, z, 1.8, 0.7, 0.08, door.base ?? "#c2a47a", "wood"));
      for (let i = 0; i < 4; i++) {
        const h = 0.45 + ((i + row) % 3) * 0.1;
        back.push(shelfBox(2.6 + i * 0.22, 0.1, z + 0.08, 0.18, 0.5, h, BOOKS[(i + row * 2) % BOOKS.length], "matte"));
      }
      if (row !== 1) back.push(sphere(at(3.9, 0.35, z + 0.32), 0.24, "#5f9a5c", "leaf"));
      else back.push(shelfBox(3.7, 0.15, z + 0.08, 0.4, 0.4, 0.3, "#e8e3d8", "gloss"));
    }
  }

  // ── 주방 (오른쪽 벽 끝) ─────────────────────────────
  const roomy = fx - kx >= 3.8;
  const sinkX = kx + (roomy ? 0.7 : 0.25);
  const cookX = fx - (roomy ? 1.9 : 1.15);
  if (hasKitchen) {
    standing.push(box([kx + 0.1, 0, 1.9], [fx - kx - 0.1, 0.03, 1.5], kitchen.splash, "gloss"));
    standing.push(box([kx + 0.1, 0, 0], [fx - kx - 0.1, 1.2, 1.75], kitchen.door, "gloss"));
    standing.push(box([kx, 0, 1.75], [fx - kx, 1.3, 0.15], kitchen.top, room.kitchen === "island" ? "wood" : "gloss"));
    standing.push(box([cookX, 0.2, 1.9], [roomy ? 1.1 : 0.9, 0.8, 0.02], "#222222", "gloss"));
    standing.push(box([sinkX, 0.15, 1.9], [roomy ? 0.9 : 0.8, 0.7, 0.02], "#b8bcbf", "metal"));
    standing.push(box([kx + 0.3, 0, 3.4], [fx - kx - 0.3, 0.7, 1.6], kitchen.door, "gloss"));
    standing.push(box([cookX - 0.05, 0, 3.0], [roomy ? 1.2 : 1.0, 0.8, 0.4], "#c9c9c6", "metal"));
    // 키 큰 냉장고장
    standing.push(box([fx, 0, 0], [1.2, 1.3, 5.2], kitchen.door, "gloss"));
    standing.push(box([fx + 0.05, 1.3, 2.4], [0.05, 0.02, 1.2], "#9a9a9a", "metal"));
    // 하부장·상부장 문 이음매와 손잡이
    const seam = tintHex(kitchen.door, -0.18);
    for (let x = kx + 0.1 + 0.9; x < fx - 0.3; x += 0.9) {
      standing.push(box([x - 0.01, 1.2, 0.1], [0.02, 0.01, 1.55], seam, "matte"));
      if (x < fx - 0.4) standing.push(box([x - 0.01, 0.7, 3.45], [0.02, 0.01, 1.5], seam, "matte"));
    }
    for (let x = kx + 0.55; x < fx - 0.3; x += 0.9) {
      standing.push(box([x - 0.15, 1.2, 1.5], [0.3, 0.04, 0.03], "#8f8f8f", "metal"));
    }
  }

  // 아일랜드 + 스툴
  const ix0 = Math.min(kx + 0.9, fx - 2.2);
  let pendants: [number, number][] | null = null;
  if (kitchen.island && hasKitchen && layout.kind === "home") {
    standing.push(box([ix0, 3.3, 0], [fx - ix0, 1.3, 1.75], kitchen.island, room.kitchen === "island" ? "wood" : "gloss"));
    standing.push(box([ix0 - 0.1, 3.2, 1.75], [fx - ix0 + 0.2, 1.5, 0.15], kitchen.top, "gloss"));
    for (const x of [ix0 + 0.6, fx - 1.2]) {
      standing.push(cyl(x + 0.2, 5.1, 0, 0.2, 0.04, "#3a3a3a", "metal"));
      standing.push(cyl(x + 0.2, 5.1, 0.04, 0.04, 1.06, "#3a3a3a", "metal"));
      standing.push(cyl(x + 0.2, 5.1, 1.1, 0.24, 0.1, room.sofa === "leather" ? "#8b5a3c" : "#c4a27f", "wood"));
    }
    pendants = [
      [ix0 + 0.9, 3.95],
      [fx - 0.9, 3.95],
    ];
  }

  // 실내 텃밭 코너 (추가 항목): 앞쪽 오른편 모서리
  if (has("planter")) {
    const px = (layout.notch ? layout.notch[0] : W) - 1.9;
    const py = D - 2.6;
    standing.push(box([px, py, 0], [1.6, 2.3, 0.9], "#a5774f", "wood"));
    for (const [x, y] of [
      [px + 0.5, py + 0.5],
      [px + 1.1, py + 1.2],
      [px + 0.5, py + 1.8],
    ]) {
      standing.push(sphere([x, y, 1.2], 0.38, "#5f9a5c", "leaf"));
      standing.push(sphere([x - 0.15, y + 0.1, 1.45], 0.22, "#78b26f", "leaf"));
    }
    standing.push(...plant(px + 1.3, py - 0.5, 1.1));
  }

  // ── 사용자가 배치한 가구 ─────────────────────────────
  room.furniture.forEach((item, index) => {
    const shapes = placeShapes(furnitureShapes(item.type, sofa, glow), item, index);
    if (findFurniture(item.type)?.flat) flat.push(...shapes);
    else standing.push(...shapes);
    const f = footprint(item);
    if (item.type === "lamp" && glow) lights.push([f.x + f.w / 2, f.y + f.d / 2, 3.1]);
    // 아일랜드가 없으면 펜던트는 첫 식탁 위에
    if (item.type === "dining" && !pendants) {
      const cx = f.x + f.w / 2;
      const cy = f.y + f.d / 2;
      // 식탁의 긴 방향을 따라 두 개
      pendants =
        item.rot % 2 === 0
          ? [
              [cx, cy - 0.7],
              [cx, cy + 0.7],
            ]
          : [
              [cx - 0.7, cy],
              [cx + 0.7, cy],
            ];
    }
  });

  // 펜던트 (간접조명 옵션)
  if (room.lighting === "indirect") {
    const spots = pendants ?? [
      [ix0 + 0.9, 4.3],
      [fx - 0.9, 4.3],
    ];
    for (const [x, y] of spots) {
      standing.push(cyl(x, y, 3.45, 0.015, H - 3.45, "#555555", "metal"));
      standing.push(sphere([x, y, 3.15], 0.18, "#ffd680", "glass", true));
      standing.push(cyl(x, y, 3.2, 0.32, 0.25, "#3b3b3b", "metal"));
      lights.push([x, y, 2.9]);
    }
  }

  [...back, ...flat, ...standing].forEach((p, i) => (p.key = i));
  const inside = ([x, y]: [number, number]) => !layout.notch || x < layout.notch[0] || y < layout.notch[1];
  return {
    size: { width: W, depth: D, notch: layout.notch },
    floor: FLOORS[room.floor],
    walls: WALLS[room.wall],
    prims: [...back, ...flat, ...depthSort(standing)],
    furniture: room.furniture.map(footprint),
    lighting: {
      mode: room.lighting as RoomModel["lighting"]["mode"],
      spots: (
        [
          [0.3, 0.3],
          [0.3, 0.7],
          [0.7, 0.7],
          [0.7, 0.35],
        ] as [number, number][]
      )
        .map(([fx, fy]): [number, number] => [fx * W, fy * D])
        .filter(inside),
      glow: room.lighting === "indirect",
    },
    lights,
  };
}
