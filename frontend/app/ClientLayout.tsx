"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, getUser, isSuperAdmin, logout, type StoredUser } from "../lib/api";

const PUBLIC_PATHS = ["/login", "/join", "/welcome", "/signup"];

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
          {/* 모든 유저 */}
          <Link href="/chat">대화</Link>
          <Link href="/history">이전 대화</Link>

          {/* 고객(customer) — 자기 영업 */}
          {!admin && <Link href="/outreach">영업</Link>}
          {!admin && <Link href="/settings/outreach">설정</Link>}
          {!admin && <Link href="/billing">요금제</Link>}

          {/* super_admin 전용 */}
          {admin && <Link href="/">대시보드</Link>}
          {admin && <Link href="/cs">CS 관리</Link>}
          {admin && <Link href="/outreach">영업</Link>}
          {admin && <Link href="/briefing">브리핑</Link>}
          {admin && <Link href="/settings">설정</Link>}
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
