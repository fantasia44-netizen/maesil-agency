import { NextRequest, NextResponse } from "next/server";

// 호스트 기반 라우팅.
// gbl.maesil.net(또는 gbl.* 서브도메인)으로 들어오면 GBL 앱만 노출하고
// 에이전시 경로(루트 포함)는 /gbl 로 보낸다. 그 외 호스트(에이전시 도메인)는 그대로.
// 리다이렉트(리라이트 아님)를 쓰는 이유: 클라이언트 usePathname()이 /gbl* 로 잡혀야
// ClientLayout이 GBL 전용 chrome로 렌더된다(리라이트면 pathname이 "/"로 남아 깨짐).
export function middleware(req: NextRequest) {
  const host = (req.headers.get("host") || "").toLowerCase();
  if (!host.startsWith("gbl.")) return NextResponse.next();

  const { pathname } = req.nextUrl;
  // GBL '앱' 경로(/gbl, /gbl/*)·정적 리소스·파일만 통과.
  // /gbl-admin 같은 에이전시 화면은 공개 도메인에서 통과시키지 않음 → /gbl로 리다이렉트.
  const isGblApp = pathname === "/gbl" || pathname.startsWith("/gbl/");
  if (
    isGblApp ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // gbl 서브도메인에서 그 외(루트·에이전시 경로)는 GBL 앱으로
  const url = req.nextUrl.clone();
  url.pathname = "/gbl";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
