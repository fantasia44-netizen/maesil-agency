"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getToken, getUser, isSuperAdmin, logout, type StoredUser } from "../lib/api";

const PUBLIC_PATHS = ["/login", "/join", "/welcome", "/signup"];

function NavGroup({ label, pathname, children }: { label: string; pathname: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  // 닫힘 유예 타이머 — 마우스가 라벨↔메뉴 사이를 지나거나 살짝 벗어나도 바로 안 닫히게
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const links = Array.isArray(children) ? children : [children];
  const active = links.some((c: any) => c?.props?.href && pathname.startsWith(c.props.href));

  const show = () => {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null; }
    setOpen(true);
  };
  const hideSoon = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  };
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);
  useEffect(() => { setOpen(false); }, [pathname]); // 이동하면 닫기

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={show}
      onMouseLeave={hideSoon}
    >
      <span
        onClick={() => setOpen(o => !o)} // 클릭으로도 토글 (터치·저속 마우스 대응)
        style={{
          fontSize: "0.9rem", color: active ? "#0f172a" : "#475569",
          fontWeight: active ? 600 : 400, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 3,
        }}>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </span>
      {open && (
        // 바깥 래퍼가 라벨과의 6px 간격을 '호버 가능한 영역'으로 포함 — 틈에서 안 끊김
        <div style={{ position: "absolute", top: "100%", left: 0, paddingTop: 6, zIndex: 100 }}>
          <div style={{
            background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
            boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
            padding: "0.35rem 0", minWidth: 120, whiteSpace: "nowrap",
          }}>
            {links.map((child: any, i: number) => (
              <div key={i} style={{ padding: "0 0.25rem" }}>
                <div style={{ borderRadius: 6 }}
                  className={pathname.startsWith(child?.props?.href) ? "nav-dropdown-active" : "nav-dropdown-item"}>
                  {child}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);

  // GBL '앱'(공개 서비스) 경로만 정밀 판정 — /gbl-admin 같은 에이전시 화면은 제외
  const isGblApp = pathname === "/gbl" || pathname.startsWith("/gbl/");

  useEffect(() => {
    const gblPublic = ["/gbl/login", "/gbl/reset", "/gbl/privacy"].some(p => pathname.startsWith(p));
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p)) || gblPublic;
    const token = getToken();

    if (!token && !isPublic) {
      // GBL 앱 경로면 GBL 로그인으로, 그 외엔 에이전시 웰컴으로
      router.replace(isGblApp ? "/gbl/login" : "/welcome");
      return;
    }
    const u = getUser();
    // gbl 유저는 에이전시 화면(관리자 포함) 접근 차단 — 항상 GBL 앱으로
    if (token && u?.role === "gbl" && !isGblApp) {
      router.replace("/gbl");
      return;
    }
    setUser(u);
    setReady(true);
  }, [pathname]);

  // 로그인 페이지 / GBL 전용 앱 화면 — 에이전시 헤더 없이 자체 chrome로 렌더
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p)) || isGblApp) {
    return <>{children}</>;
  }

  if (!ready) return null;

  const admin = isSuperAdmin();

  return (
    <>
      <header className="app-header">
        <div className="brand">maesil-agency</div>
        <nav>
          {/* super_admin 전용 */}
          {admin && <Link href="/">대시보드</Link>}
          {admin && <Link href="/admin">관리자</Link>}

          {admin && <NavGroup label="국내영업" pathname={pathname}>
            <Link href="/outreach">리드관리</Link>
            <Link href="/offline">오프라인영업</Link>
            <Link href="/namecard">명함</Link>
          </NavGroup>}

          {admin && <NavGroup label="해외영업" pathname={pathname}>
            <Link href="/brand">브랜드관리</Link>
            <Link href="/buyers">바이어목록</Link>
          </NavGroup>}

          {admin && <Link href="/cs">CS관리</Link>}
          {admin && <Link href="/warehouse">창고·물류</Link>}
          {admin && <NavGroup label="재무" pathname={pathname}>
            <Link href="/finance">재무센터</Link>
            <Link href="/accounting">회계</Link>
          </NavGroup>}
          {admin && <Link href="/briefing">브리핑</Link>}
          {admin && <Link href="/chat">대화</Link>}
          {admin && <Link href="/gbl">GBL</Link>}
          {admin && <Link href="/gbl-admin">GBL관리</Link>}
          {admin && <Link href="/settings">설정</Link>}

          {/* 고객(customer) */}
          {!admin && <Link href="/outreach">영업</Link>}
          {!admin && <Link href="/chat">대화</Link>}
          {!admin && <Link href="/settings/outreach">설정</Link>}
          {!admin && <Link href="/billing">요금제</Link>}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {user && (
            <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
              {user.display_name || user.email}
              {admin && (
                <span style={{
                  marginLeft: 6, fontSize: "0.65rem", background: "#0f172a",
                  color: "#fff", padding: "1px 6px", borderRadius: 4,
                }}>
                  ADMIN
                </span>
              )}
            </span>
          )}
          <button
            onClick={logout}
            style={{
              fontSize: "0.75rem", padding: "4px 10px",
              border: "1px solid #e2e8f0", borderRadius: 6,
              background: "transparent", cursor: "pointer", color: "#64748b",
            }}
          >
            로그아웃
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </>
  );
}
