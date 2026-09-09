// TCG Note 푸터 — 정책 링크(소개·개인정보·약관) + 비공식 고지. 전 페이지 노출(AdSense 요건).
import Link from "next/link";
import { localizePath, isLocale, defaultLocale, type Locale } from "../../../lib/i18n";

const T: Record<Locale, { about: string; privacy: string; terms: string; contact: string; disclaimer: string }> = {
  ko: { about: "소개", privacy: "개인정보처리방침", terms: "이용약관", contact: "문의", disclaimer: "TCG Note는 팬 제작 비공식 사이트입니다. 포켓몬 관련 권리는 각 권리자에게 있습니다. 덱 통계 출처: Limitless TCG." },
  en: { about: "About", privacy: "Privacy", terms: "Terms", contact: "Contact", disclaimer: "TCG Note is an unofficial fan-made site. Pokémon rights belong to their respective owners. Deck stats: Limitless TCG." },
  ja: { about: "概要", privacy: "プライバシー", terms: "利用規約", contact: "お問い合わせ", disclaimer: "TCG Note はファン制作の非公式サイトです。ポケモン関連の権利は各権利者に帰属します。デッキ統計出典: Limitless TCG。" },
  "zh-TW": { about: "關於", privacy: "隱私權", terms: "使用條款", contact: "聯絡", disclaimer: "TCG Note 為粉絲製作非官方網站。寶可夢相關權利歸各權利人。牌組統計來源: Limitless TCG。" },
};

export default function TcgFooter({ lang: raw }: { lang: string }) {
  const lang: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = T[lang];
  const L = (p: string) => localizePath(lang, p);
  const link = { fontSize: "0.8rem", color: "#dc2626", textDecoration: "none", fontWeight: 600 } as const;
  return (
    <footer style={{ borderTop: "1px solid #fbd8d8", background: "#fef7f5", marginTop: 24 }}>
      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "1.3rem 1rem 1.6rem" }}>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 8 }}>
          <Link href={L("/tcg/about")} style={link}>{t.about}</Link>
          <Link href={L("/tcg/contact")} style={link}>{t.contact}</Link>
          <Link href={L("/tcg/privacy")} style={link}>{t.privacy}</Link>
          <Link href={L("/tcg/terms")} style={link}>{t.terms}</Link>
        </div>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "#a3a3b3", lineHeight: 1.6 }}>{t.disclaimer}</p>
        <p style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#cbd5e1" }}>© {new Date().getFullYear()} TCG Note</p>
      </div>
    </footer>
  );
}
