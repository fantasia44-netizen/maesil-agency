"use client";
// 타협개체 분석 페이지 링크 공유 — 분량이 커 이미지 저장 대신 URL을 SNS로 공유.
// 네이티브 공유시트(navigator.share) → 미지원 시 클립보드 복사 폴백.
import { useState } from "react";
import type { Locale } from "../../../../../lib/i18n";

const T: Record<Locale, { share: string; copied: string }> = {
  ko: { share: "링크 공유", copied: "링크 복사됨!" },
  en: { share: "Share link", copied: "Link copied!" },
  ja: { share: "リンク共有", copied: "リンクをコピーしました" },
  "zh-TW": { share: "分享連結", copied: "已複製連結" },
};

export default function LinkShareButton({ lang, title }: { lang: Locale; title: string }) {
  const t = T[lang] || T.en;
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = typeof window !== "undefined" ? window.location.href : "https://gblnote.com";
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try { await navigator.share({ title, text: title, url }); return; }
      catch { /* 사용자 취소/미지원 → 복사 폴백 */ }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt(t.copied, url);
    }
  }

  return (
    <button onClick={onShare} aria-label={t.share}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "none", cursor: "pointer",
        background: copied ? "#16a34a" : "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff",
        fontWeight: 800, fontSize: "0.82rem", borderRadius: 999, padding: "7px 16px",
        boxShadow: "0 4px 12px -4px rgba(59,91,219,.5)", transition: "background .2s" }}>
      {copied ? `✅ ${t.copied}` : `🔗 ${t.share}`}
    </button>
  );
}
