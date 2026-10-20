import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { connection } from "next/server";
import { createSeed, seedShowrooms } from "./seed";
import type { Database } from "./types";

/**
 * MVP용 파일 저장소. 모든 레코드에 companyId가 있고, 조회 함수는 항상 companyId로 거른다.
 * 나중에 Supabase(Postgres + RLS)로 옮길 때 이 파일만 바꾸면 된다.
 */
export const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

let queue: Promise<unknown> = Promise.resolve();
let seeding: Promise<Database> | null = null;

async function load(): Promise<Database> {
  try {
    const db = JSON.parse(await readFile(DB_FILE, "utf8")) as Database;
    // 집자랑 기능 이전에 만든 파일
    db.showrooms ??= seedShowrooms();
    return db;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    // 첫 요청 여러 개가 동시에 와도 시드는 한 번만 쓴다.
    seeding ??= (async () => {
      const seed = createSeed();
      await save(seed);
      return seed;
    })();
    return seeding;
  }
}

async function save(db: Database): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  // Windows는 다른 요청이 파일을 읽는 중이면 rename이 잠깐 실패할 수 있다.
  for (let attempt = 0; ; attempt++) {
    try {
      await rename(tmp, DB_FILE);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      if (attempt >= 5 || (code !== "EPERM" && code !== "EBUSY" && code !== "EACCES")) throw err;
      await new Promise((r) => setTimeout(r, 30 * (attempt + 1)));
    }
  }
}

/** 요청마다 최신 데이터를 읽는다. 호출하는 컴포넌트는 Suspense 안에 있어야 한다. */
export async function readDb(): Promise<Database> {
  await connection();
  await queue;
  return load();
}

/** 쓰기는 한 번에 하나씩 직렬로 처리한다. */
export function mutateDb<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

/** 공유 링크 토큰: 추측 불가능한 128비트 */
export function newShareToken(): string {
  return randomBytes(16).toString("base64url");
}
