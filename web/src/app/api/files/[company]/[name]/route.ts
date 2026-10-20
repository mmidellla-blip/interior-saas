import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/files/[company]/[name]">) {
  const { company, name } = await ctx.params;
  if (!/^[\w-]+$/.test(company) || !/^[\w-]+\.jpg$/.test(name)) {
    return new Response("Not found", { status: 404 });
  }
  try {
    const bytes = await readFile(path.join(UPLOAD_DIR, company, name));
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/jpeg",
        // 파일 이름이 무작위라 내용이 바뀌지 않는다.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
