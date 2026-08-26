"use client";

// 쿠팡 파트너스 다이나믹 배너(공식 g.js 위젯). 파트너스에서 발급한 id·trackingCode를 env로.
// 미설정 시 렌더 안 함. 법적 고지 문구 자동 포함(미표기 시 제재 대상).
// ※ 위젯이 뜨려면 쿠팡 파트너스 대시보드에 사이트 도메인이 등록/승인돼 있어야 함.
import { useEffect, useRef } from "react";

const CID = process.env.NEXT_PUBLIC_COUPANG_ID || "";
const CTRACK = process.env.NEXT_PUBLIC_COUPANG_TRACKING || "";

export default function CoupangAd() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!CID || !CTRACK || !ref.current) return;
    const mount = ref.current;
    let cancelled = false;

    const render = () => {
      if (cancelled || !mount) return;
      const PC = (window as any).PartnersCoupang;
      if (!PC || !PC.G) return;
      try {
        mount.innerHTML = ""; // 중복 렌더 방지
        // eslint-disable-next-line no-new
        new PC.G({ id: Number(CID), trackingCode: CTRACK, subId: null, template: "carousel", width: "680", height: "140", container: mount });
      } catch { /* noop */ }
    };

    if ((window as any).PartnersCoupang) {
      render();
    } else {
      const s = document.createElement("script");
      s.src = "https://ads-partners.coupang.com/g.js";
      s.async = true;
      s.onload = render;
      document.body.appendChild(s);
    }
    return () => { cancelled = true; };
  }, []);

  if (!CID || !CTRACK) return null;
  return (
    <div style={{ marginTop: 18, textAlign: "center" }}>
      <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>🎮 GBL 플레이어 추천템</div>
      <div ref={ref} style={{ maxWidth: 680, minHeight: 140, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center" }} />
      <p style={{ fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.5, maxWidth: 680, margin: "6px auto 0" }}>
        이 영역은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
