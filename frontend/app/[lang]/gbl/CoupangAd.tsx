"use client";

// 쿠팡 파트너스 다이나믹 배너(공식 g.js 위젯). 파트너스에서 발급한 id·trackingCode를 env로.
// 미설정 시 렌더 안 함. 법적 고지 문구 자동 포함(미표기 시 제재 대상).
// ※ 위젯이 뜨려면 쿠팡 파트너스 대시보드에 사이트 도메인이 등록/승인돼 있어야 함.
// ※ 위젯이 상품을 못 채우면 iframe이 0×0으로 접힘 → 라벨·고지가 빈 박스로 남지 않도록
//    "채움 감지" 후에만 노출(한 번 채워지면 유지 → 캐러셀 전환/재로드로 인한 깜빡임 방지).
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const CID = process.env.NEXT_PUBLIC_COUPANG_ID || "";
const CTRACK = process.env.NEXT_PUBLIC_COUPANG_TRACKING || "";

// 라벨·쿠팡 고지 4개국어(비한국어 페이지 한글 노출 방지 + 언어별 고지 컴플라이언스).
const LB: Record<string, { label: string; disc: string }> = {
  ko: { label: "🎮 GBL 플레이어 추천템", disc: "이 영역은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." },
  en: { label: "🎮 Recommended for GBL players", disc: "As a Coupang Partners affiliate, we earn a commission from qualifying purchases." },
  ja: { label: "🎮 GBLプレイヤーおすすめ", disc: "本エリアはCoupangパートナーズ活動の一環として、一定額の手数料を得ています。" },
  "zh-TW": { label: "🎮 GBL 玩家推薦", disc: "本區塊為 Coupang Partners 合作的一部分，我們會因此獲得一定金額的佣金。" },
};
const langOf = (p: string) => (p.startsWith("/en/") || p === "/en") ? "en" : (p.startsWith("/ja/") || p === "/ja") ? "ja" : (p.startsWith("/zh-TW/") || p === "/zh-TW") ? "zh-TW" : "ko";

export default function CoupangAd() {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(false);
  const t = LB[langOf(usePathname() || "")] || LB.ko;

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
      <div hidden={!filled} style={{ fontSize: "0.72rem", color: "#94a3b8", marginBottom: 6 }}>{t.label}</div>
      {/* 위젯 마운트(항상 존재해야 g.js가 렌더) — 미충전 시 높이 0으로 접어 빈 자리 제거 */}
      <div ref={ref} style={{ maxWidth: 680, minHeight: filled ? 140 : 0, margin: "0 auto", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }} />
      <p hidden={!filled} style={{ fontSize: "0.72rem", color: "#cbd5e1", lineHeight: 1.5, maxWidth: 680, margin: "6px auto 0" }}>
        {t.disc}
      </p>
    </div>
  );
}
