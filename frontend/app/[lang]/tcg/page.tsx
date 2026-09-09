// TCG Note 랜딩 — 서버렌더(정문 독창성). 크롤러가 초기 HTML에서 h1·미션·내부링크를 읽음.
// 백엔드 의존 없음(정적 SSR). 하위 콘텐츠 페이지(티어·덱·카드·가이드)는 데이터 파이프라인과 함께 구축.
import Link from "next/link";
import type { Metadata } from "next";
import { isLocale, defaultLocale, localizePath, hreflangLanguages, type Locale } from "../../../lib/i18n";
import { getTcg } from "./dict";

export const revalidate = 3600;

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  return { alternates: { canonical: localizePath(lang, "/tcg"), languages: hreflangLanguages("/tcg") } };
}

const BORDER = "#fbd8d8";

export default function TcgLandingPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const L = (p: string) => localizePath(lang, p);
  const t = getTcg(lang);

  return (
    <>
      {/* ── SSR 미션 히어로 ── */}
      <div style={{ background: "linear-gradient(180deg,#fee6e6,#fef7f5)", padding: "1.6rem 1rem 0.6rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/tcg-icon.png" alt="TCG Note" width={40} height={40} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: "1.35rem", fontWeight: 900, color: "#dc2626", letterSpacing: "-0.5px" }}>{t.brand}</span>
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: "clamp(1.2rem,4.5vw,1.6rem)", fontWeight: 900, color: "#b91c1c", letterSpacing: "-0.5px", lineHeight: 1.25 }}>
            {t.hero.h1}
          </h1>
          <p style={{ margin: "0 0 12px", fontSize: "0.88rem", color: "#5b4a4a", lineHeight: 1.65, maxWidth: 760 }}>
            {t.hero.mission}
          </p>
          <nav style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {t.funnel.map((f) => (
              <Link key={f.path} href={L(f.path)} style={{
                fontSize: "0.8rem", fontWeight: 700, color: "#dc2626", textDecoration: "none",
                background: "#fff", border: "1px solid #f7d6d6", borderRadius: 999, padding: "5px 13px",
              }}>{f.label}</Link>
            ))}
          </nav>
        </div>
      </div>

      {/* ── 직접 써보는 대화형 도구(실기능 서비스 신호 — 심사자/크롤러가 'DB복사'가 아님을 홈에서 즉시 인식) ── */}
      <div style={{ background: "#fff", padding: "1.2rem 1rem 0.4rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ margin: "0 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.tools.h}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
            {t.tools.items.map((it) => (
              <Link key={it.href} href={L(it.href)} style={{
                display: "flex", alignItems: "flex-start", gap: 10, background: "#fff",
                border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.85rem 1rem", textDecoration: "none",
              }}>
                <span style={{ fontSize: "1.5rem", lineHeight: 1, flexShrink: 0 }}>{it.icon}</span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: "0.92rem", fontWeight: 800, color: "#b91c1c", marginBottom: 2 }}>{it.t}</span>
                  <span style={{ display: "block", fontSize: "0.78rem", color: "#64748b", lineHeight: 1.5 }}>{it.d}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── 자체 분석 원본 3종(원본성 신호) ── */}
      <div style={{ background: "#fef7f5", padding: "1rem 1rem 1.6rem" }}>
        <div style={{ maxWidth: 1040, margin: "0 auto" }}>
          <h2 style={{ margin: "0.6rem 0 10px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{t.signature.h}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
            {t.signature.items.map((it) => (
              <Link key={it.href} href={L(it.href)} style={{
                display: "block", background: "#fff", border: `1px solid ${BORDER}`, borderLeft: "4px solid #dc2626",
                borderRadius: 12, padding: "0.8rem 1rem", textDecoration: "none",
              }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>{it.t}</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", lineHeight: 1.55 }}>{it.d}</div>
              </Link>
            ))}
          </div>
          <p style={{ margin: "16px 0 0", fontSize: "0.72rem", color: "#a3a3b3" }}>{t.footerNote}</p>
        </div>
      </div>
    </>
  );
}
