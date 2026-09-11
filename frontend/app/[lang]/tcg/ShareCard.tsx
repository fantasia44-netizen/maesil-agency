"use client";
// 재사용 공유 카드 래퍼 — children(스타일된 카드 DOM)을 html-to-image로 PNG 캡처.
// 모바일=네이티브 공유 시트, 데스크톱=미리보기 모달(이미지 저장+링크 복사). 공유/저장 시 track 발사.
// 브리핑 요약·대표덱·카운터 카드가 공통으로 사용.
import { useRef, useState, type ReactNode } from "react";
import { toPng } from "html-to-image";
import { track } from "../../../lib/track";

export type ShareUI = { share: string; save: string; copy: string; copied: string; close: string };

// 공용 공유 버튼 라벨(4개국어) — 각 카드가 카드 제목·내용만 신경쓰도록.
export function shareUiFor(lang: string): ShareUI {
  const M: Record<string, ShareUI> = {
    ko: { share: "공유", save: "이미지 저장", copy: "링크 복사", copied: "복사됨", close: "닫기" },
    en: { share: "Share", save: "Save image", copy: "Copy link", copied: "Copied", close: "Close" },
    ja: { share: "共有", save: "画像を保存", copy: "リンクをコピー", copied: "コピー完了", close: "閉じる" },
    "zh-TW": { share: "分享", save: "儲存圖片", copy: "複製連結", copied: "已複製", close: "關閉" },
  };
  return M[lang] || M.ko;
}

export default function ShareCard({
  children, ui, filename, shareTitle, trackLabel, trackPath = "/tcg", compact = false,
}: {
  children: ReactNode; ui: ShareUI; filename: string; shareTitle: string;
  trackLabel: string; trackPath?: string; compact?: boolean;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const render = async (): Promise<string | null> =>
    cardRef.current ? toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true }) : null;

  const isMobile = () => {
    try { return window.matchMedia("(pointer: coarse)").matches || (navigator.maxTouchPoints ?? 0) > 0; } catch { return false; }
  };
  const save = (url: string) => { const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); };

  async function onShare() {
    setBusy(true);
    try {
      const url = await render(); if (!url) return;
      track("share", trackPath, trackLabel, "tcg");
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (isMobile() && nav.share && nav.canShare) {
        try {
          const file = new File([await (await fetch(url)).blob()], filename, { type: "image/png" });
          if (nav.canShare({ files: [file] })) { await nav.share({ files: [file], title: shareTitle, text: `${shareTitle} · tcgnote.net` }); return; }
        } catch (e) { if ((e as Error)?.name === "AbortError") return; }
      }
      setModalUrl(url);
    } catch { /* noop */ } finally { setBusy(false); }
  }
  async function onSave() {
    setBusy(true);
    try { const url = await render(); if (!url) return; track("download", trackPath, trackLabel, "tcg"); save(url); }
    catch { /* noop */ } finally { setBusy(false); }
  }
  async function copyLink() {
    const link = typeof window !== "undefined" ? window.location.href.split("#")[0] : "https://tcgnote.net" + trackPath;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { window.prompt("URL", link); }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 420, overflow: "hidden", borderRadius: 16, boxShadow: "0 4px 24px rgba(220,38,38,0.12)" }}>
        <div ref={cardRef}>{children}</div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onShare} disabled={busy} style={btn("#dc2626", compact)}>📤 {ui.share}</button>
        <button onClick={onSave} disabled={busy} style={btn("#334155", compact)}>⬇️ {ui.save}</button>
      </div>

      {modalUrl && (
        <div onClick={() => setModalUrl(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, padding: 16, maxWidth: 460, width: "100%", boxShadow: "0 12px 48px rgba(0,0,0,0.3)" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={modalUrl} alt={shareTitle} style={{ width: "100%", borderRadius: 10, display: "block", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => save(modalUrl)} style={btn("#dc2626")}>⬇️ {ui.save}</button>
              <button onClick={copyLink} style={btn(copied ? "#16a34a" : "#334155")}>{copied ? `✓ ${ui.copied}` : `🔗 ${ui.copy}`}</button>
              <button onClick={() => setModalUrl(null)} style={btn("#94a3b8")}>{ui.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function btn(bg: string, compact = false): React.CSSProperties {
  return { padding: compact ? "7px 13px" : "10px 18px", borderRadius: 10, border: "none", background: bg, color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: compact ? "0.8rem" : "0.9rem" };
}
