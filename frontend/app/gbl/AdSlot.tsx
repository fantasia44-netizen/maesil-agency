"use client";

import { useEffect, useRef } from "react";
import { getUser } from "../../lib/api";

// Google AdSense 슬롯 (웹 퍼블리셔 광고).
// NEXT_PUBLIC_ADSENSE_CLIENT(ca-pub-...) 가 설정돼야 실제 노출.
// 미설정 시(로컬·미승인) 아무것도 렌더 안 함 → 개발 중 방해 없음.
const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "";
const DEFAULT_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || "";

let scriptInjected = false;
function ensureScript(client: string) {
  if (scriptInjected || typeof document === "undefined") return;
  if (document.querySelector('script[data-adsense="1"]')) { scriptInjected = true; return; }
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-adsense", "1");
  document.head.appendChild(s);
  scriptInjected = true;
}

export default function AdSlot({ slot }: { slot?: string }) {
  const ref = useRef<HTMLModElement>(null);
  const adSlot = slot || DEFAULT_SLOT;

  // 내 계정(super_admin)은 광고 없이 사용 — 광고는 공개(gbl) 유저에게만
  const isOwner = getUser()?.role === "super_admin";

  useEffect(() => {
    if (!CLIENT || !adSlot || isOwner) return;
    ensureScript(CLIENT);
    try {
      // @ts-expect-error adsbygoogle 전역
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch { /* 광고 차단 등 무시 */ }
  }, [isOwner, adSlot]);

  // client·slot 둘 다 있어야 렌더(slot 비면 깨진 빈 광고 방지)
  if (!CLIENT || !adSlot || isOwner) return null;

  return (
    <div style={{ margin: "18px 0", textAlign: "center", minHeight: 60 }}>
      <ins
        ref={ref}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={CLIENT}
        data-ad-slot={adSlot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
