// 정책·소개 문서 공용 렌더(서버 컴포넌트). privacy/terms/about 페이지가 재사용.
import Link from "next/link";
import { localizePath, type Locale } from "../../../lib/i18n";
import { type LegalDoc } from "./legal";

const UPDATED_LABEL: Record<Locale, string> = { ko: "갱신", en: "Updated", ja: "更新", "zh-TW": "更新" };
const BACK_LABEL: Record<Locale, string> = { ko: "← TCG Note", en: "← TCG Note", ja: "← TCG Note", "zh-TW": "← TCG Note" };

export default function LegalView({ doc, lang }: { doc: LegalDoc; lang: Locale }) {
  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ fontSize: "0.78rem", marginBottom: 6 }}>
        <Link href={localizePath(lang, "/tcg")} style={{ color: "#dc2626", textDecoration: "none" }}>{BACK_LABEL[lang]}</Link>
      </div>
      <h1 style={{ margin: "0 0 4px", fontSize: "1.4rem", fontWeight: 900, color: "#0f172a" }}>{doc.title}</h1>
      <p style={{ margin: "0 0 18px", fontSize: "0.74rem", color: "#94a3b8" }}>{UPDATED_LABEL[lang]}: {doc.updated}</p>
      {doc.sections.map((s, i) => (
        <section key={i} style={{ marginBottom: 16 }}>
          <h2 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>{s.h}</h2>
          {s.body.map((p, j) => (
            <p key={j} style={{ margin: "0 0 6px", fontSize: "0.88rem", color: "#475569", lineHeight: 1.75 }}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}
