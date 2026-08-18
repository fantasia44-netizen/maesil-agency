"use client";

import Link from "next/link";

// 개인정보처리방침 — 공개 페이지 (AdSense·Play스토어 심사 필수).
// 운영자 연락처(CONTACT) — 실제 수신되는 운영 창구(super_admin 계정, 확정 2026-08-18).
const CONTACT = "support@maesil-insight.com";
const EFFECTIVE = "2026-08-18";

export default function GblPrivacy() {
  const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 800, margin: "1.6rem 0 0.5rem" };
  const p: React.CSSProperties = { margin: "0.4rem 0", lineHeight: 1.75, color: "#334155", fontSize: "0.92rem" };
  const li: React.CSSProperties = { ...p, margin: "0.25rem 0" };

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.1rem 4rem", background: "#fff", color: "#0f172a" }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/gbl/login" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0.3rem 0 0.2rem" }}>개인정보처리방침</h1>
      <p style={{ ...p, color: "#94a3b8", fontSize: "0.8rem" }}>시행일: {EFFECTIVE}</p>

      <p style={p}>
        GBL Note(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며, 아래와 같이 수집·이용·보관합니다.
        본 방침은 서비스(gbl.maesil.net) 이용자에게 적용됩니다.
      </p>

      <h2 style={h2}>1. 수집하는 항목</h2>
      <p style={li}>• 계정: 이메일 주소, 비밀번호(암호화 저장), 닉네임(선택)</p>
      <p style={li}>• 이용 기록: 이용자가 직접 입력한 포켓몬 GO GBL 대전 메모(상대 이름, 사용 포켓몬·기술, 메모 등)</p>
      <p style={li}>• 자동 수집: 서비스 운영·오류 분석을 위한 접속 로그, 쿠키(로그인 유지·광고)</p>

      <h2 style={h2}>2. 이용 목적</h2>
      <p style={li}>• 회원 식별 및 로그인 유지</p>
      <p style={li}>• 이용자가 입력한 대전 기록의 저장·조회 기능 제공</p>
      <p style={li}>• 서비스 개선 및 오류 대응</p>

      <h2 style={h2}>3. 보관 및 파기</h2>
      <p style={p}>
        개인정보는 회원 탈퇴 또는 삭제 요청 시까지 보관하며, 요청 시 지체 없이 파기합니다.
        개별 대전 기록(상대 이름·메모 등)은 해당 이용자 본인만 조회할 수 있으며, 다른 이용자에게 공개되지 않습니다.
      </p>
      <p style={p}>
        단, 서비스는 전체 이용자의 대전 데이터를 <b>개인 식별정보를 제거한 익명 통계</b>(포켓몬·덱 사용률 등)로
        가공하여 공개 메타 페이지에 표시할 수 있습니다. 이 통계에는 상대 이름·이용자 정보 등 개인을 식별할 수 있는
        내용이 포함되지 않습니다.
      </p>

      <h2 style={h2}>4. 제3자 제공·처리 위탁</h2>
      <p style={p}>
        서비스는 개인정보를 외부에 판매하지 않습니다. 다만 아래 인프라 제공자를 통해 데이터가 처리됩니다.
      </p>
      <p style={li}>• Supabase(데이터 저장), Render(서버 호스팅)</p>
      <p style={li}>
        • Google AdSense(광고): 광고 제공을 위해 쿠키가 사용될 수 있습니다. 이용자는{" "}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={{ color: "#3b5bdb" }}>
          Google 광고 설정
        </a>
        에서 맞춤 광고를 관리·거부할 수 있습니다.
      </p>
      <p style={li}>
        • 쿠팡 파트너스(제휴 광고): 서비스에는 쿠팡 파트너스 제휴 링크·배너가 포함될 수 있으며,
        이를 통해 쿠팡의 쿠키가 설정될 수 있습니다. 이 배너 노출·클릭에 따라 서비스는 일정액의 수수료를 제공받습니다.
      </p>

      <h2 style={h2}>5. 이용자의 권리</h2>
      <p style={p}>
        이용자는 언제든 본인의 개인정보 열람·수정·삭제 및 처리 정지를 요청할 수 있습니다.
        계정·데이터 삭제를 원하시면 아래 연락처로 요청해 주세요.
      </p>

      <h2 style={h2}>6. 문의처</h2>
      <p style={p}>개인정보 관련 문의: <a href={`mailto:${CONTACT}`} style={{ color: "#3b5bdb" }}>{CONTACT}</a></p>

      <p style={{ ...p, marginTop: "1.8rem", color: "#94a3b8", fontSize: "0.8rem" }}>
        본 방침은 관련 법령 및 서비스 정책에 따라 변경될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.
      </p>
    </div>
  );
}
