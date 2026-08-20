// GBL 가이드 아티클 — 서버렌더 SEO. 원문 한국어 콘텐츠(AdSense 가치 콘텐츠).
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../AdSlot";
import CoupangAd from "../../CoupangAd";
import { GUIDES } from "../guides";

export const revalidate = 86400;


export function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = GUIDES[params.slug];
  if (!g) return { title: "GBL Note" };
  return {
    title: `${g.title} | GBL Note`,
    description: g.desc,
    keywords: g.keywords,
    alternates: { canonical: `/gbl/guide/${params.slug}` },
    openGraph: { title: g.title, description: g.desc, url: `/gbl/guide/${params.slug}`, images: ["/gbl-og.png"], type: "article" },
  };
}

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function GuidePage({ params }: { params: { slug: string } }) {
  const g = GUIDES[params.slug];
  if (!g) notFound();
  const others = Object.entries(GUIDES).filter(([s]) => s !== params.slug);

  return (
    <div style={{ minHeight: "100dvh", background: "linear-gradient(180deg,#f7f9fd,#eef2fb)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 8, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/gbl" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
          <Link href="/gbl/guide" style={{ fontSize: "0.8rem", color: "#3b5bdb", textDecoration: "none" }}>📖 가이드 목록</Link>
        </div>

        <article>
          <h1 style={{ margin: "0.2rem 0 0.3rem", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.35 }}>{g.title}</h1>
          <p style={{ margin: "0 0 1rem", fontSize: "0.76rem", color: "#94a3b8" }}>업데이트 {g.updated} · GBL Note 가이드</p>

          {g.sections.map((s, i) => (
            <section key={i} style={{ marginBottom: 16 }}>
              {s.h && <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>{s.h}</h2>}
              <p style={{ margin: 0, fontSize: "0.92rem", color: "#334155", lineHeight: 1.85 }}>{s.p}</p>
              {i === 1 && <div style={{ marginTop: 14 }}><AdSlot /></div>}
            </section>
          ))}
        </article>

        <CoupangAd />

        <div style={{ marginTop: 24, padding: "1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>다른 가이드</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {others.map(([s, gg]) => (
              <Link key={s} href={`/gbl/guide/${s}`} style={{ fontSize: "0.86rem", color: "#3b5bdb", textDecoration: "none" }}>· {gg.title}</Link>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: "0.82rem", color: "#475569" }}>
            지금 리그 메타가 궁금하다면 <Link href="/gbl/meta/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>실측 메타</Link> ·{" "}
            <Link href="/gbl/tier/master" style={{ color: "#3b5bdb", fontWeight: 600 }}>티어표</Link>를 확인하세요.
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 22, fontSize: "0.72rem", color: "#94a3b8" }}>
          <Link href="/gbl/privacy" style={{ color: "#64748b", textDecoration: "none" }}>개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
}
