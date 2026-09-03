"use client";

// 쿠팡 파트너스 다이나믹 배너(공식 g.js 위젯). 파트너스에서 발급한 id·trackingCode를 env로.
// 미설정 시 렌더 안 함. 법적 고지 문구 자동 포함(미표기 시 제재 대상).
// ※ 위젯이 뜨려면 쿠팡 파트너스 대시보드에 사이트 도메인이 등록/승인돼 있어야 함.
// ※ 위젯이 상품을 못 채우면 iframe이 0×0으로 접힘 → 라벨·고지가 빈 박스로 남지 않도록
//    "채움 감지" 후에만 노출(한 번 채워지면 유지 → 캐러셀 전환/재로드로 인한 깜빡임 방지).
import { useEffect, useRef, useState } from "react";

const CID = process.env.NEXT_PUBLIC_COUPANG_ID || "";
const CTRACK = process.env.NEXT_PUBLIC_COUPANG_TRACKING || "";

export default function CoupangAd() {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);

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

    // 채움 감지: iframe이 실제 높이를 가지면(상품 채워짐) 노출 확정하고 폴링 종료.
    // 미충전이면 일정 시간 후 포기(숨김 유지) — 빈 라벨/박스 방지.
    let tries = 0;
    const poll = setInterval(() => {
      if (cancelled) return;
      const ifr = mount.querySelector("iframe") as HTMLIFrameElement | null;
      if (ifr && ifr.offsetHeight > 10) { setFilled(true); clearInterval(poll); }
      else if (++tries > 12) { clearInterval(poll); } // ~15초 미충전 → 숨김 유지
    }, 1200);

    return () => { cancelled = true; clearInterval(poll); };
  }, []);

  if (!CID || !CTRACK) return null;
  return (
    <div style={{ marginTop: filled ? 18 : 0, textAlign: "center" }}>
      <div hidden={!filled} style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>🎮 GBL 플레이어 추천템</div>
      {/* 위젯 마운트(항상 존재해야 g.js가 렌더) — 미충전 시 높이 0으로 접어 빈 자리 제거 */}
      <div ref={ref} style={{ maxWidth: 680, minHeight: filled ? 140 : 0, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }} />
      <p hidden={!filled} style={{ fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.5, maxWidth: 680, margin: "6px auto 0" }}>
        이 영역은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.
      </p>
    </div>
  );
}
