// 개인정보처리방침 — 서버렌더 공개 페이지 (AdSense·검색·스토어 요건).
import Link from "next/link";
import type { Metadata } from "next";

const CONTACT = "support@maesil-insight.com";  // 실제 수신 운영 창구
const EFFECTIVE = "2026-08-19";

export const metadata: Metadata = {
  title: "개인정보처리방침 | GBL Note",
  description: "GBL Note(gblnote.com)의 개인정보 수집·이용·보관 및 제3자 처리(광고·분석) 안내.",
  alternates: { canonical: "/gbl/privacy" },
};

const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 800, margin: "1.6rem 0 0.5rem", color: "#0f172a" };
const p: React.CSSProperties = { margin: "0.4rem 0", lineHeight: 1.75, color: "#334155", fontSize: "0.92rem" };
const li: React.CSSProperties = { ...p, margin: "0.25rem 0" };
const a: React.CSSProperties = { color: "#3b5bdb" };

export default function GblPrivacy() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.1rem 4rem", background: "#fff", color: "#0f172a" }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0.3rem 0 0.2rem" }}>개인정보처리방침</h1>
      <p style={{ ...p, color: "#94a3b8", fontSize: "0.8rem" }}>시행일: {EFFECTIVE}</p>

      <p style={p}>
        GBL Note(이하 &quot;서비스&quot;)는 이용자의 개인정보를 중요하게 생각하며, 아래와 같이 수집·이용·보관합니다.
        본 방침은 서비스(gblnote.com) 이용자에게 적용됩니다.
      </p>

      <h2 style={h2}>1. 수집하는 항목</h2>
      <p style={li}>• 계정: 이메일 주소, 비밀번호(암호화 저장), 닉네임(선택). 구글 로그인 시 구글이 제공하는 이메일·프로필.</p>
      <p style={li}>• 이용 기록: 이용자가 직접 입력한 포켓몬 GO GBL 대전 메모(상대 이름, 사용 포켓몬·기술, 메모 등)</p>
      <p style={li}>• 자동 수집: 접속 로그, 쿠키 및 유사기술(로그인 유지·광고·분석), 기기·브라우저 정보, 대략적 접속 지역</p>

      <h2 style={h2}>2. 이용 목적</h2>
      <p style={li}>• 회원 식별 및 로그인 유지</p>
      <p style={li}>• 이용자가 입력한 대전 기록의 저장·조회 기능 제공</p>
      <p style={li}>• 서비스 개선, 방문 통계 분석, 오류 대응</p>
      <p style={li}>• 광고 제공 및 서비스 운영</p>

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

      <h2 style={h2}>4. 제3자 처리 위탁 및 쿠키</h2>
      <p style={p}>서비스는 개인정보를 외부에 판매하지 않습니다. 다만 아래 제공자를 통해 데이터가 처리되며, 각 제공자는 쿠키·식별자를 사용할 수 있습니다.</p>
      <p style={li}>• Supabase(데이터 저장), Render(서버 호스팅), Cloudflare(도메인·네트워크)</p>
      <p style={li}>
        • Google Analytics(방문 통계): 방문·페이지뷰·기기·대략적 지역 등을 익명 집계합니다. 이용자는{" "}
        <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" style={a}>Google 애널리틱스 차단 도구</a>로 거부할 수 있습니다.
      </p>
      <p style={li}>
        • Google AdSense(광고): 맞춤 광고를 위해 쿠키가 사용될 수 있습니다. 이용자는{" "}
        <a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" style={a}>Google 광고 설정</a>에서 관리·거부할 수 있습니다.
      </p>
      <p style={li}>
        • 쿠팡 파트너스(제휴 광고): 서비스에는 쿠팡 파트너스 제휴 링크·배너가 포함될 수 있으며, 이를 통해 쿠팡의 쿠키가 설정될 수 있습니다.
        이 배너 노출·클릭에 따라 서비스는 일정액의 수수료를 제공받습니다.
      </p>
      <p style={li}>
        이용자는 브라우저 설정에서 쿠키 저장을 거부할 수 있으나, 이 경우 로그인 유지 등 일부 기능이 제한될 수 있습니다.
      </p>

      <h2 style={h2}>5. 이용자의 권리</h2>
      <p style={p}>
        이용자는 언제든 본인의 개인정보 열람·수정·삭제 및 처리 정지를 요청할 수 있습니다.
        계정·데이터 삭제를 원하시면 아래 연락처로 요청해 주세요.
      </p>

      <h2 style={h2}>6. 문의처</h2>
      <p style={p}>개인정보 관련 문의: <a href={`mailto:${CONTACT}`} style={a}>{CONTACT}</a></p>

      <p style={{ ...p, marginTop: "1.8rem", color: "#94a3b8", fontSize: "0.8rem" }}>
        본 방침은 관련 법령 및 서비스 정책에 따라 변경될 수 있으며, 변경 시 본 페이지를 통해 공지합니다.{" "}
        <Link href="/gbl/terms" style={a}>이용약관</Link>
      </p>
    </div>
  );
}
