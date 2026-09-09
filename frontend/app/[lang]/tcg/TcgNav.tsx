"use client";
// TCG Note 상단 내비 — 섹션 링크 + 로케일 스위처. gbl의 GblNav 축약형.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeMeta, localizePath, defaultLocale, isLocale, type Locale } from "../../../lib/i18n";
import { getTcg } from "./dict";

// 경로에서 현재 로케일 추출 (/en/tcg/... → en, /tcg/... → ko)
function localeOf(pathname: string): Locale {
  const seg = pathname.split("/")[1];
  return isLocale(seg) ? seg : defaultLocale;
}
// 로케일 프리픽스를 제거한 "맨몸" 경로 (/en/tcg/decks → /tcg/decks)
function barePath(pathname: string): string {
  const seg = pathname.split("/")[1];
  return isLocale(seg) ? pathname.slice(seg.length + 1) || "/tcg" : pathname || "/tcg";
}

export default function TcgNav() {
  const pathname = usePathname() || "/tcg";
  const lang = localeOf(pathname);
  const bare = barePath(pathname);
  const t = getTcg(lang);
  const L = (p: string) => localizePath(lang, p);

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", borderBottom: "1px solid #fbd8d8" }}>
      <nav style={{ maxWidth: 1040, margin: "0 auto", display: "flex", alignItems: "center", gap: 6, padding: "0.55rem 1rem", flexWrap: "wrap" }}>
        <Link href={L("/tcg")} style={{ fontWeight: 900, fontSize: "1rem", color: "#dc2626", textDecoration: "none", letterSpacing: "-0.4px", marginRight: 6 }}>
          🎴 {t.brand}
        </Link>
        <div style={{ display: "flex", gap: 2, flexWrap: "wrap", flex: 1 }}>
          {t.nav.map((n) => {
            const active = bare === n.path || bare.startsWith(n.path + "/");
            return (
              <Link key={n.key} href={L(n.path)} style={{
                fontSize: "0.82rem", fontWeight: 700, textDecoration: "none",
                color: active ? "#dc2626" : "#475569", background: active ? "#fee6e6" : "transparent",
                borderRadius: 8, padding: "5px 10px",
              }}>{n.label}</Link>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {locales.map((l) => (
            <Link key={l} href={localizePath(l, bare)} hrefLang={localeMeta[l].htmlLang} style={{
              fontSize: "0.68rem", fontWeight: 800, textDecoration: "none", borderRadius: 999, padding: "3px 8px",
              color: l === lang ? "#fff" : "#94a3b8", background: l === lang ? "#dc2626" : "transparent",
            }}>{localeMeta[l].short}</Link>
          ))}
        </div>
      </nav>
    </header>
  );
}
