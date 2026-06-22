"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, getUser, isSuperAdmin, logout, type StoredUser } from "../lib/api";

const PUBLIC_PATHS = ["/login", "/join", "/welcome", "/signup"];

function NavGroup({ label, pathname, children }: { label: string; pathname: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const links = Array.isArray(children) ? children : [children];
  const active = links.some((c: any) => c?.props?.href && pathname.startsWith(c.props.href));

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span style={{
        fontSize: "0.9rem", color: active ? "#0f172a" : "#475569",
        fontWeight: active ? 600 : 400, cursor: "default",
        display: "flex", alignItems: "center", gap: 3,
      }}>
        {label}
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </span>
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, marginTop: 4,
          background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          padding: "0.35rem 0", zIndex: 100, minWidth: 120, whiteSpace: "nowrap",
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
      )}
    </div>
  );
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [user, setUser] = useState<StoredUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p));
    const token = getToken();

    if (!token && !isPublic) {
      router.replace("/welcome");
      return;
    }
    setUser(getUser());
    setReady(true);
  }, [pathname]);

  // 로그인 페이지 — 헤더 없이 렌더
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
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
          </NavGroup>}

          {admin && <NavGroup label="해외영업" pathname={pathname}>
            <Link href="/brand">브랜드관리</Link>
            <Link href="/buyers">바이어목록</Link>
          </NavGroup>}

          {admin && <Link href="/cs">CS관리</Link>}
          {admin && <Link href="/warehouse">창고·물류</Link>}
          {admin && <Link href="/accounting">회계</Link>}
          {admin && <Link href="/briefing">브리핑</Link>}
          {admin && <Link href="/chat">대화</Link>}
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
