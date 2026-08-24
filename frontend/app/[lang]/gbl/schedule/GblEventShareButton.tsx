"use client";
// GBL 이벤트 카드의 공유 버튼 — 클릭 시 GblEventBrochure(공유 포스터) 모달을 연다.
import { useState } from "react";
import GblEventBrochure from "./GblEventBrochure";
import type { GblEvent } from "./gblEvents";
import type { ScheduleDict } from "./dict";
import type { Locale } from "../../../../lib/i18n";

export default function GblEventShareButton({ ev, lang, t, label }: { ev: GblEvent; lang: Locale; t: ScheduleDict; label: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}
        style={{ display: "inline-flex", alignItems: "center", gap: 5, border: "none", cursor: "pointer",
          background: "linear-gradient(90deg,#db2777,#7c3aed)", color: "#fff", fontWeight: 800, fontSize: "0.76rem",
          borderRadius: 999, padding: "5px 13px", boxShadow: "0 4px 12px -4px rgba(124,58,237,.5)" }}>
        📸 {label}
      </button>
      {open && <GblEventBrochure ev={ev} lang={lang} t={t} onClose={() => setOpen(false)} />}
    </>
  );
}
