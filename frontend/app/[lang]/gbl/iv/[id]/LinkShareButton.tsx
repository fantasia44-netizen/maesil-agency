"use client";
// 타협개체 분석 페이지 링크 공유 — 분량이 커 이미지 저장 대신 URL을 SNS로 공유.
// 클릭 시 링크가 보이는 팝업(모달)을 띄운다 → PC/모바일 모두 확실한 시각 피드백.
// 모달 안: [링크 복사](클립보드) + [기기 공유](navigator.share 지원 시) + 닫기.
import { useRef, useState } from "react";
import type { Locale } from "../../../../../lib/i18n";

const T: Record<Locale, { btn: string; title: string; copy: string; copied: string; native: string; close: string; hint: string }> = {
  ko: { btn: "링크 공유", title: "링크 공유", copy: "링크 복사", copied: "복사됨!", native: "기기 공유", close: "닫기", hint: "이 주소를 복사해 카톡·카페·SNS에 붙여넣으세요." },
  en: { btn: "Share link", title: "Share link", copy: "Copy link", copied: "Copied!", native: "Share…", close: "Close", hint: "Copy this link and paste it anywhere." },
  ja: { btn: "リンク共有", title: "リンク共有", copy: "リンクをコピー", copied: "コピーしました", native: "共有", close: "閉じる", hint: "このURLをコピーしてSNS等に貼り付けてください。" },
  "zh-TW": { btn: "分享連結", title: "分享連結", copy: "複製連結", copied: "已複製", native: "分享", close: "關閉", hint: "複製此連結並貼到社群或訊息中。" },
};

export default function LinkShareButton({ lang, title }: { lang: Locale; title: string }) {
  const t = T[lang] || T.en;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const url = typeof window !== "undefined" ? window.location.href : "https://gblnote.com";
  const canNative = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 클립보드 API 차단 시 → 입력창 선택해 사용자가 Ctrl+C
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }

  async function nativeShare() {
    try { await navigator.share({ title, text: title, url }); }
    catch { /* 사용자 취소 무시 */ }
  }

  const btnBase: React.CSSProperties = {
    border: "none", cursor: "pointer", fontWeight: 800, fontSize: "0.86rem",
    borderRadius: 10, padding: "10px 16px", display: "inline-flex", alignItems: "center", gap: 6,
  };

  return (
    <>
      <button onClick={() => setOpen(true)} aria-label={t.btn}
        style={{ ...btnBase, fontSize: "0.82rem", borderRadius: 999, padding: "7px 16px",
          background: "linear-gradient(90deg,#3b5bdb,#7c3aed)", color: "#fff",
          boxShadow: "0 4px 12px -4px rgba(59,91,219,.5)" }}>
        🔗 {t.btn}
      </button>

      {open && (
        <div onClick={() => setOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(30,41,80,.45)", backdropFilter: "blur(2px)", WebkitBackdropFilter: "blur(2px)",
            zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, padding: "18px 18px 16px", width: "100%", maxWidth: 420,
              boxShadow: "0 20px 60px rgba(20,20,60,.35)", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/gbl-icon.png" alt="" width={22} height={22} />
              <span style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a" }}>🔗 {t.title}</span>
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>{t.hint}</div>

            <input ref={inputRef} readOnly value={url}
              onFocus={(e) => e.currentTarget.select()}
              style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10,
                border: "1px solid #dbe4f5", background: "#f8fafc", fontSize: "0.82rem", color: "#334155" }} />

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={copy}
                style={{ ...btnBase, flex: 1, justifyContent: "center", minWidth: 120,
                  background: copied ? "#16a34a" : "#3b5bdb", color: "#fff", transition: "background .2s" }}>
                {copied ? `✅ ${t.copied}` : `📋 ${t.copy}`}
              </button>
              {canNative && (
                <button onClick={nativeShare}
                  style={{ ...btnBase, justifyContent: "center", background: "#eef2ff", color: "#3b5bdb", border: "1px solid #dbe4f5" }}>
                  📤 {t.native}
                </button>
              )}
              <button onClick={() => setOpen(false)}
                style={{ ...btnBase, justifyContent: "center", background: "#f1f5f9", color: "#64748b" }}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
