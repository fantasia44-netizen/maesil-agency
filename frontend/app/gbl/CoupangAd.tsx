"use client";

// 쿠팡 파트너스 다이나믹 배너(위젯). 파트너스에서 만든 위젯의
// id·trackingCode를 env로 넣으면 노출. 미설정 시 아무것도 렌더 안 함.
// 법적 고지 문구 자동 포함(미표기 시 제재 대상).
const CID = process.env.NEXT_PUBLIC_COUPANG_ID || "";
const CTRACK = process.env.NEXT_PUBLIC_COUPANG_TRACKING || "";

export default function CoupangAd() {
  if (!CID || !CTRACK) return null;
  const src =
    `https://ads-partners.coupang.com/widgets.html?id=${CID}` +
    `&template=carousel&trackingCode=${CTRACK}&subId=&width=680&height=140&tsource=`;
  return (
    <div style={{ marginTop: 18, textAlign: "center" }}>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>🎮 GBL 플레이어 추천템</div>
      <iframe
        src={src}
        title="쿠팡 추천 상품"
        width="100%"
        height={140}
        frameBorder={0}
        scrolling="no"
        referrerPolicy="unsafe-url"
        style={{ maxWidth: 680, border: "none", display: "inline-block" }}
      />
      <p style={{ fontSize: "0.62rem", color: "#cbd5e1", marginTop: 6, lineHeight: 1.5, maxWidth: 680, margin: "6px auto 0" }}>
        이 영역은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
