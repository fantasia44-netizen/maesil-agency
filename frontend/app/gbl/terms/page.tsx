// 이용약관 — 서버렌더 공개 페이지.
import Link from "next/link";
import type { Metadata } from "next";

const CONTACT = "support@maesil-insight.com";
const EFFECTIVE = "2026-08-19";

export const metadata: Metadata = {
  title: "이용약관 | GBL Note",
  description: "GBL Note(gblnote.com) 서비스 이용약관 — 계정, 이용자 의무, 콘텐츠, 광고, 면책, 준거법 안내.",
  alternates: { canonical: "/gbl/terms" },
};

const h2: React.CSSProperties = { fontSize: "1.05rem", fontWeight: 800, margin: "1.6rem 0 0.5rem", color: "#0f172a" };
const p: React.CSSProperties = { margin: "0.4rem 0", lineHeight: 1.75, color: "#334155", fontSize: "0.92rem" };
const li: React.CSSProperties = { ...p, margin: "0.25rem 0" };
const a: React.CSSProperties = { color: "#3b5bdb" };

export default function GblTerms() {
  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.1rem 4rem", background: "#fff", color: "#0f172a" }}>
      <div style={{ marginBottom: 6 }}>
        <Link href="/gbl" style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>← GBL Note</Link>
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0.3rem 0 0.2rem" }}>이용약관</h1>
      <p style={{ ...p, color: "#94a3b8", fontSize: "0.8rem" }}>시행일: {EFFECTIVE}</p>

      <h2 style={h2}>제1조 (목적·적용)</h2>
      <p style={p}>본 약관은 GBL Note(이하 &quot;서비스&quot;, gblnote.com)의 이용 조건과 이용자·운영자의 권리·의무를 정합니다. 서비스를 이용하면 본 약관에 동의한 것으로 봅니다.</p>

      <h2 style={h2}>제2조 (서비스 내용)</h2>
      <p style={p}>서비스는 포켓몬 GO 배틀리그(GBL) 관련 <b>대전 상대 기록·조회, 실측 메타 통계, 티어·기술·카운터 정보</b> 등을 제공하는 무료 웹 서비스입니다. 일부 콘텐츠는 로그인 없이 이용할 수 있습니다.</p>

      <h2 style={h2}>제3조 (계정)</h2>
      <p style={li}>• 이용자는 정확한 정보로 가입하며, 계정 정보(비밀번호 등)를 스스로 안전하게 관리할 책임이 있습니다.</p>
      <p style={li}>• 하나의 계정을 여러 사람이 공유하는 것은 제한될 수 있습니다.</p>
      <p style={li}>• 이용자는 언제든 탈퇴할 수 있으며, 탈퇴 시 계정·기록은 파기됩니다.</p>

      <h2 style={h2}>제4조 (이용자의 의무·금지행위)</h2>
      <p style={p}>이용자는 다음 행위를 해서는 안 됩니다.</p>
      <p style={li}>• 허위·조작 데이터를 대량 입력해 통계를 왜곡하는 행위</p>
      <p style={li}>• 타인 사칭, 타인의 개인정보 무단 수집·게시</p>
      <p style={li}>• 자동화된 방법으로 서비스를 과도하게 조회·수집하거나 서버에 부하를 주는 행위</p>
      <p style={li}>• 서비스 운영을 방해하거나 관련 법령을 위반하는 행위</p>
      <p style={p}>위반 시 운영자는 사전 통지 없이 이용을 제한하거나 계정을 정지·삭제할 수 있습니다.</p>

      <h2 style={h2}>제5조 (이용자 콘텐츠)</h2>
      <p style={p}>이용자가 입력한 대전 기록의 권리는 이용자에게 있습니다. 다만 이용자는 서비스가 해당 데이터를 <b>개인 식별정보를 제거한 익명 통계</b>(실측 메타 등)로 가공·표시하는 것에 동의합니다. 개별 기록은 본인만 조회할 수 있습니다.</p>

      <h2 style={h2}>제6조 (광고)</h2>
      <p style={p}>서비스는 운영을 위해 Google AdSense, 쿠팡 파트너스 등 광고·제휴 링크를 게재할 수 있습니다. 광고 및 제휴 상품의 내용·거래에 대한 책임은 해당 광고주·판매자에게 있습니다. 자세한 사항은 <Link href="/gbl/privacy" style={a}>개인정보처리방침</Link>을 참고하세요.</p>

      <h2 style={h2}>제7조 (서비스의 제공·변경·중단)</h2>
      <p style={p}>서비스는 무료로 제공되며, 운영자는 필요에 따라 서비스 내용을 변경하거나 중단할 수 있습니다. 이용자는 본인의 데이터를 스스로 백업할 책임이 있으며, 서비스 중단·장애로 인한 데이터 손실에 대해 운영자는 고의·중과실이 없는 한 책임지지 않습니다.</p>

      <h2 style={h2}>제8조 (면책)</h2>
      <p style={li}>• 서비스가 제공하는 통계·티어·기술 정보 등은 참고용이며, 정확성·완전성을 보증하지 않습니다.</p>
      <p style={li}>• 무료 서비스로서, 운영자는 관련 법령이 허용하는 범위에서 서비스 이용으로 발생한 손해에 대해 책임을 지지 않습니다.</p>

      <h2 style={h2}>제9조 (지식재산권)</h2>
      <p style={p}>서비스의 디자인·코드·편집물에 대한 권리는 운영자에게 있습니다. 포켓몬(Pokémon), 포켓몬 GO 등 게임 관련 명칭·이미지의 권리는 각 권리자에게 있으며, 서비스는 관련 정보를 정보 제공 목적으로 다룹니다.</p>

      <h2 style={h2}>제10조 (준거법·관할)</h2>
      <p style={p}>본 약관은 대한민국 법을 준거법으로 하며, 분쟁은 관련 법령에 따른 관할 법원에서 해결합니다.</p>

      <h2 style={h2}>제11조 (문의)</h2>
      <p style={p}>약관·서비스 관련 문의: <a href={`mailto:${CONTACT}`} style={a}>{CONTACT}</a> (<Link href="/gbl/contact" style={a}>문의 페이지</Link>)</p>

      <p style={{ ...p, marginTop: "1.8rem", color: "#94a3b8", fontSize: "0.8rem" }}>
        본 약관은 관련 법령·정책에 따라 변경될 수 있으며, 변경 시 본 페이지에 공지합니다.
      </p>
    </div>
  );
}
