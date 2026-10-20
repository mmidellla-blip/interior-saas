import { NextResponse, type NextRequest } from "next/server";

/**
 * 관리자 화면 진입 전 낙관적 검사. 실제 권한 확인은 각 페이지와 서버 액션의 requireAdmin()이 한다.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("admin_session")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/((?!login).*)"],
};
