"use client";
import type { ReactNode } from "react";

// 공유/저장 미리보기 모달 — 밝은 배경 + 상단 로고·GBL Note + 하단 주소.
export default function ShareModal({ img, onClose, children }: { img: string; onClose: () => void; children: ReactNode }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(40,52,90,.42)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)",
        zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", padding: 14 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: "#ffffff", borderRadius: 18, padding: "14px 14px 12px", maxWidth: "94vw", maxHeight: "92vh",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 10, boxShadow: "0 20px 60px rgba(20,20,60,.35)" }}>
        {/* 상단: 로고 + GBL Note */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gbl-icon.png" alt="" width={26} height={26} />
          <span style={{ fontWeight: 900, fontSize: "1rem", color: "#0f172a", letterSpacing: "-0.2px" }}>GBL Note</span>
        </div>
        {/* 이미지 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt="공유 이미지" style={{ maxWidth: "100%", maxHeight: "62vh", borderRadius: 10, border: "1px solid #eef2f8" }} />
        {/* 버튼 */}
        <div style={{ display: "flex", gap: 10 }}>{children}</div>
        {/* 하단 주소 */}
        <div style={{ fontSize: "0.74rem", color: "#94a3b8", fontWeight: 600 }}>https://gblnote.com</div>
      </div>
    </div>
  );
}
