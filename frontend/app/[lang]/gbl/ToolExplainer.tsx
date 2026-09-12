// 도구 페이지(시뮬레이터·교환목록·IV체커) 하단의 서버렌더 설명 본문.
// 도구 UI는 클라이언트 컴포넌트라 크롤러·심사자에게는 h1+한 줄만 보였다 → 원리·사용법·FAQ를
// 초기 HTML에 담아 "도구 껍데기"가 아니라 "설명이 있는 콘텐츠 페이지"로 읽히게 한다.
// FAQ는 FAQPage 구조화 데이터로도 노출.
import Link from "next/link";
import JsonLd from "./JsonLd";
import type { ToolContent } from "./toolContent";

const CARD = "#ffffff";
const BORDER = "#e3e8f2";

export default function ToolExplainer({ c, L }: { c: ToolContent; L: (p: string) => string }) {
  const faqJsonLd = c.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: c.faq.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      }
    : null;
  return (
    <section style={{ marginTop: 28 }} aria-label={c.h2}>
      {faqJsonLd && <JsonLd data={faqJsonLd} />}
      <h2 style={{ fontSize: "1.15rem", fontWeight: 900, color: "#0f172a", margin: "0 0 4px" }}>{c.h2}</h2>
      {c.lead && <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "#475569", lineHeight: 1.75 }}>{c.lead}</p>}

      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
        {c.sections.map((s, i) => (
          <div key={i} style={{ marginBottom: i === c.sections.length - 1 ? 0 : 16 }}>
            <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a", margin: "0 0 5px" }}>{s.h}</h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.8 }}>{s.p}</p>
          </div>
        ))}
      </div>

      {c.faq.length > 0 && (
        <div style={{ marginTop: 16, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "1rem 1.1rem" }}>
          <h3 style={{ fontSize: "0.98rem", fontWeight: 800, color: "#0f172a", margin: "0 0 8px" }}>{c.faqH}</h3>
          {c.faq.map((f, i) => (
            <details key={i} open style={{ marginBottom: 8 }}>
              <summary style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", cursor: "pointer" }}>{f.q}</summary>
              <p style={{ margin: "6px 0 0", fontSize: "0.86rem", color: "#475569", lineHeight: 1.75 }}>{f.a}</p>
            </details>
          ))}
        </div>
      )}

      {c.related.length > 0 && (
        <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 800, color: "#0f172a" }}>{c.relatedH}</span>
          {c.related.map((r) => (
            <Link key={r.path} href={L(r.path)} style={{ fontSize: "0.8rem", fontWeight: 600, color: "#3b5bdb", textDecoration: "none", background: "#eef2fb", border: `1px solid ${BORDER}`, borderRadius: 999, padding: "4px 12px" }}>
              {r.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
