"use client";
// GBL 사이트 공통 상단 네비게이션 — 반응형(데스크톱 그룹 드롭다운 / 모바일 햄버거 드로어) + 언어토글 통합.
// 레이아웃에 마운트되어 전 gbl 페이지 공통. 회원 전용은 '커뮤니티'로 묶음(페이지 자체가 로그인 게이트).
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { locales, localeMeta, isLocale, defaultLocale, localizePath, type Locale } from "../../../lib/i18n";

type Item = { path: string };
type Group = { key: string; href: string; items?: Item[] };

const GROUPS: Group[] = [
  { key: "raid", href: "/gbl/raid", items: [
    { path: "/gbl/raid" }, { path: "/gbl/raid/schedule" }, { path: "/gbl/raid/bosses" }, { path: "/gbl/trade" },
  ] },
  { key: "pvp", href: "/gbl/tier/master", items: [
    { path: "/gbl/tier/master" }, { path: "/gbl/meta" }, { path: "/gbl/cmp/master" }, { path: "/gbl/iv" }, { path: "/gbl/schedule" },
  ] },
  { key: "guide", href: "/gbl/guide" },
  { key: "community", href: "/gbl/board", items: [
    { path: "/gbl/board" }, { path: "/gbl/gallery" }, { path: "/gbl/app" }, { path: "/gbl/contact" },
  ] },
];

type Dict = { groups: Record<string, string>; items: Record<string, string>; menu: string; member: string };
const T: Record<Locale, Dict> = {
  ko: {
    groups: { raid: "레이드", pvp: "배틀리그", guide: "가이드", community: "커뮤니티" },
    items: {
      "/gbl/raid": "딜러 티어", "/gbl/raid/schedule": "레이드 일정", "/gbl/raid/bosses": "보스 100% CP",
      "/gbl/tier/master": "티어표", "/gbl/meta": "실측 메타", "/gbl/cmp/master": "CMP 우선권", "/gbl/iv": "PvP IV 순위", "/gbl/schedule": "시즌 일정",
      "/gbl/trade": "교환 목록 메이커", "/gbl/board": "게시판", "/gbl/gallery": "자랑 갤러리", "/gbl/app": "내 전적", "/gbl/contact": "문의",
    },
    menu: "메뉴", member: "회원",
  },
  en: {
    groups: { raid: "Raids", pvp: "Battle League", guide: "Guides", community: "Community" },
    items: {
      "/gbl/raid": "Attacker Tiers", "/gbl/raid/schedule": "Raid Schedule", "/gbl/raid/bosses": "Boss 100% CP",
      "/gbl/tier/master": "Tier List", "/gbl/meta": "Live Meta", "/gbl/cmp/master": "CMP Priority", "/gbl/iv": "PvP IV Ranks", "/gbl/schedule": "Season Schedule",
      "/gbl/trade": "Trade List Maker", "/gbl/board": "Board", "/gbl/gallery": "Gallery", "/gbl/app": "My Record", "/gbl/contact": "Contact",
    },
    menu: "Menu", member: "Members",
  },
  ja: {
    groups: { raid: "レイド", pvp: "バトルリーグ", guide: "ガイド", community: "コミュニティ" },
    items: {
      "/gbl/raid": "アタッカー", "/gbl/raid/schedule": "レイド日程", "/gbl/raid/bosses": "ボス100%CP",
      "/gbl/tier/master": "ティア表", "/gbl/meta": "実測メタ", "/gbl/cmp/master": "CMP優先", "/gbl/iv": "PvP個体値", "/gbl/schedule": "シーズン日程",
      "/gbl/trade": "交換リストメーカー", "/gbl/board": "掲示板", "/gbl/gallery": "ギャラリー", "/gbl/app": "戦績記録", "/gbl/contact": "お問い合わせ",
    },
    menu: "メニュー", member: "会員",
  },
};
const MEMBER_PATHS = new Set(["/gbl/board", "/gbl/gallery", "/gbl/app", "/gbl/contact"]);

function bareOf(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length && isLocale(seg[0]) && seg[0] !== defaultLocale) return "/" + seg.slice(1).join("/");
  return pathname || "/gbl";
}
function localeOf(pathname: string): Locale {
  const first = pathname.split("/").filter(Boolean)[0];
  return first && isLocale(first) ? first : defaultLocale;
}

const INK = "#0f172a", SUB = "#475569", BLUE = "#3b5bdb", BORDER = "#e6ebf5";

export default function GblNav() {
  const pathname = usePathname() || "/gbl";
  const bare = bareOf(pathname);
  const lang = localeOf(pathname);
  const t = T[lang] || T.ko;
  const L = (p: string) => localizePath(lang, p);

  const [hover, setHover] = useState<string | null>(null);  // 데스크톱 드롭다운
  const [drawer, setDrawer] = useState(false);              // 모바일 드로어
  const [acc, setAcc] = useState<string | null>(null);      // 모바일 아코디언

  const isActive = (g: Group) => bare === g.href || (g.items?.some((it) => bare === it.path || bare.startsWith(it.path + "/")) ?? bare.startsWith(g.href));

  return (
    <>
      <style>{`
        .gnav-desk{display:flex}
        .gnav-mob{display:none}
        @media(max-width:860px){ .gnav-desk{display:none} .gnav-mob{display:flex} }
        .gnav-drop{opacity:0;visibility:hidden;transform:translateY(4px);transition:opacity .14s,transform .14s,visibility .14s}
        .gnav-grp:hover .gnav-drop, .gnav-drop.open{opacity:1;visibility:visible;transform:translateY(0)}
        .gnav-item:hover{background:#f4f7fc}
        .gnav-grpbtn:hover{background:#f1f5f9}
      `}</style>

      <header style={{ position: "sticky", top: 0, zIndex: 60, background: "rgba(255,255,255,.92)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 8, padding: "0 12px", height: 52 }}>
          {/* 로고 */}
          <Link href={L("/gbl")} style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", flexShrink: 0 }} onClick={() => setDrawer(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gbl-icon.png" alt="" width={26} height={26} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: "1.05rem", fontWeight: 900, letterSpacing: "-0.4px", color: "#1a2570" }}>GBL Note</span>
          </Link>

          {/* ── 데스크톱 그룹 네비 ── */}
          <nav className="gnav-desk" style={{ alignItems: "center", gap: 2, marginLeft: 8 }}>
            {GROUPS.map((g) => {
              const active = isActive(g);
              const label = (
                <Link href={L(g.href)} className="gnav-grpbtn"
                  style={{ display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", borderRadius: 9, padding: "7px 11px",
                    fontSize: "0.9rem", fontWeight: 800, color: active ? BLUE : "#334155" }}>
                  {t.groups[g.key]}{g.items && <span style={{ fontSize: "0.6rem", opacity: 0.6 }}>▾</span>}
                </Link>
              );
              if (!g.items) return <div key={g.key}>{label}</div>;
              return (
                <div key={g.key} className="gnav-grp" style={{ position: "relative" }}>
                  {label}
                  <div className="gnav-drop" style={{ position: "absolute", top: "100%", left: 0, paddingTop: 6 }}>
                    <div style={{ minWidth: 180, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, boxShadow: "0 14px 34px -14px rgba(15,23,42,.28)", padding: 6 }}>
                      {g.items.map((it) => (
                        <Link key={it.path} href={L(it.path)} className="gnav-item"
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, textDecoration: "none", borderRadius: 8, padding: "9px 11px",
                            fontSize: "0.86rem", fontWeight: 700, color: bare === it.path ? BLUE : INK }}>
                          {t.items[it.path]}
                          {MEMBER_PATHS.has(it.path) && <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#a855f7", background: "#f3e8ff", borderRadius: 999, padding: "1px 7px" }}>{t.member}</span>}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>

          {/* 우측: 언어토글(데스크톱) */}
          <div className="gnav-desk" style={{ marginLeft: "auto", alignItems: "center", gap: 3 }}>
            {locales.map((l) => {
              const on = l === lang;
              return (
                <Link key={l} href={localizePath(l, bare)} hrefLang={localeMeta[l].htmlLang} title={localeMeta[l].label}
                  style={{ fontSize: "0.72rem", fontWeight: 800, padding: "4px 9px", borderRadius: 999, textDecoration: "none",
                    color: on ? "#fff" : SUB, background: on ? BLUE : "transparent" }}>
                  {l === "ko" ? "KO" : l === "en" ? "EN" : "JA"}
                </Link>
              );
            })}
          </div>

          {/* ── 모바일: 언어 + 햄버거 ── */}
          <div className="gnav-mob" style={{ marginLeft: "auto", alignItems: "center", gap: 4 }}>
            {locales.map((l) => {
              const on = l === lang;
              return (
                <Link key={l} href={localizePath(l, bare)} hrefLang={localeMeta[l].htmlLang}
                  style={{ fontSize: "0.66rem", fontWeight: 800, padding: "3px 7px", borderRadius: 999, textDecoration: "none",
                    color: on ? "#fff" : SUB, background: on ? BLUE : "transparent" }}>
                  {l === "ko" ? "KO" : l === "en" ? "EN" : "JA"}
                </Link>
              );
            })}
            <button onClick={() => setDrawer((v) => !v)} aria-label={t.menu}
              style={{ marginLeft: 2, width: 38, height: 34, borderRadius: 9, border: `1px solid ${BORDER}`, background: drawer ? "#eef2fb" : "#fff", cursor: "pointer", fontSize: "1.1rem", lineHeight: 1, color: INK }}>
              {drawer ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* ── 모바일 드로어 ── */}
        {drawer && (
          <div className="gnav-mob" style={{ flexDirection: "column", borderTop: `1px solid ${BORDER}`, background: "#fff", padding: "6px 10px 12px", maxHeight: "80vh", overflowY: "auto" }}>
            {GROUPS.map((g) => {
              if (!g.items) {
                return (
                  <Link key={g.key} href={L(g.href)} onClick={() => setDrawer(false)}
                    style={{ display: "block", textDecoration: "none", padding: "12px 8px", fontSize: "0.95rem", fontWeight: 800, color: INK, borderBottom: `1px solid ${BORDER}` }}>
                    {t.groups[g.key]}
                  </Link>
                );
              }
              const open = acc === g.key;
              return (
                <div key={g.key} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <button onClick={() => setAcc(open ? null : g.key)}
                    style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer",
                      padding: "12px 8px", fontSize: "0.95rem", fontWeight: 800, color: INK }}>
                    {t.groups[g.key]}<span style={{ fontSize: "0.7rem", opacity: 0.6, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}>▾</span>
                  </button>
                  {open && (
                    <div style={{ paddingBottom: 6 }}>
                      {g.items.map((it) => (
                        <Link key={it.path} href={L(it.path)} onClick={() => setDrawer(false)}
                          style={{ display: "flex", alignItems: "center", gap: 7, textDecoration: "none", padding: "10px 8px 10px 20px", fontSize: "0.88rem", fontWeight: 600, color: bare === it.path ? BLUE : "#334155" }}>
                          {t.items[it.path]}
                          {MEMBER_PATHS.has(it.path) && <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#a855f7", background: "#f3e8ff", borderRadius: 999, padding: "1px 6px" }}>{t.member}</span>}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </header>
    </>
  );
}
