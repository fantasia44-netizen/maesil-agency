"use client";

export default function AccountingPage() {
  return (
    <div style={{ padding: "2rem" }}>
      <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.5rem" }}>회계</h1>
      <p style={{ color: "#64748b", fontSize: "0.9rem", marginBottom: "2rem" }}>
        매출·정산·수수료 관리
      </p>
      <div style={{
        background: "#f8fafc", border: "1px dashed #cbd5e1",
        borderRadius: 12, padding: "3rem", textAlign: "center", color: "#94a3b8",
      }}>
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>📊</div>
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>준비 중</div>
        <div style={{ fontSize: "0.85rem" }}>영업 수수료·매출 정산 기능 개발 예정</div>
      </div>
    </div>
  );
}
