"use client";

export default function BuyersPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>바이어 발굴</h1>
      <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "2rem" }}>
        해외 B2B 바이어 발굴 및 이메일 영업 관리
      </p>
      <div style={{
        background: "#f8fafc", border: "1px dashed #cbd5e1",
        borderRadius: 12, padding: "3rem", textAlign: "center", color: "#94a3b8",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🌏</div>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>준비 중</div>
        <div style={{ fontSize: "0.85rem" }}>Apollo.io / 무역 DB 연동 후 해외 바이어 자동 발굴</div>
      </div>
    </div>
  );
}
