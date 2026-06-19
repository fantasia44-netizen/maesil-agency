"use client";

import { useEffect, useState } from "react";
import { getUser, logout, type StoredUser } from "../../lib/api";

const GREEN = "#1A6F3C";

function Item({ n, title, desc, soon }: { n: number; title: string; desc: string; soon?: boolean }) {
  return (
    <div style={{
      display: "flex", gap: "0.9rem", alignItems: "flex-start",
      background: "#fff", border: "1px solid #eef2f0", borderRadius: 12, padding: "1.1rem 1.2rem",
    }}>
      <div style={{
        flexShrink: 0, width: 30, height: 30, borderRadius: "50%",
        background: GREEN, color: "#fff", fontWeight: 700, fontSize: "0.85rem",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>{n}</div>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.95rem" }}>{title}</span>
          {soon && (
            <span style={{
              fontSize: "0.68rem", fontWeight: 700, color: "#b45309",
              background: "#fef3c7", padding: "1px 7px", borderRadius: 10,
            }}>곧 오픈</span>
          )}
        </div>
        <div style={{ fontSize: "0.86rem", color: "#64748b", marginTop: 3, lineHeight: 1.55 }}>{desc}</div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const [user, setUser] = useState<StoredUser | null>(null);
  useEffect(() => { setUser(getUser()); }, []);

  const name = user?.display_name || user?.email?.split("@")[0] || "";

  return (
    <div style={{ minHeight: "100vh", background: "#f7faf8", padding: "3rem 1.5rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: "2.4rem" }}>🎉</div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: "0.6rem 0 0.4rem", color: "#0f172a" }}>
            워크스페이스가 만들어졌어요{name ? `, ${name}님` : ""}!
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.95rem", lineHeight: 1.6 }}>
            14일 무료 체험이 시작됐습니다. 아래 3단계만 마치면 AI가 영업을 자동으로 돌립니다.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
          <Item n={1} title="Gmail 연결" soon
            desc="내 Google 계정을 연결하면 본인 메일함에서 콜드메일이 발송됩니다(도달률·평판 분리)." />
          <Item n={2} title="타겟 키워드 설정" soon
            desc="찾고 싶은 유튜버·블로거 키워드를 입력하면 AI가 매일 잠재 파트너를 발굴합니다." />
          <Item n={3} title="자동 발송 시작" soon
            desc="발굴·분석·발송·팔로업이 자동으로 진행됩니다. 대시보드에서 성과만 확인하세요." />
        </div>

        <div style={{
          marginTop: "1.8rem", background: "#e7f4ec", border: "1px solid #cdeBD8",
          borderRadius: 12, padding: "1.1rem 1.2rem", fontSize: "0.88rem", color: "#14532d", lineHeight: 1.6,
        }}>
          <strong>준비 중입니다.</strong> 셀프 설정(Gmail 연결·키워드)과 내 대시보드가 곧 열립니다.
          오픈되면 가입하신 이메일로 안내드릴게요.
        </div>

        <div style={{ textAlign: "center", marginTop: "1.8rem" }}>
          <button onClick={logout} style={{
            fontSize: "0.82rem", padding: "0.5rem 1.1rem", border: "1px solid #e2e8f0",
            borderRadius: 8, background: "#fff", cursor: "pointer", color: "#64748b",
          }}>로그아웃</button>
        </div>
      </div>
    </div>
  );
}
