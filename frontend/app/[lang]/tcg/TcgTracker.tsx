"use client";
import { usePathname, useParams } from "next/navigation";
import { useEffect } from "react";
import { track } from "../../../lib/track";
import { isLocale, localeMeta, defaultLocale } from "../../../lib/i18n";

// 모든 /tcg/* 페이지뷰를 tcg 자체 통계로 전송(비로그인 포함, 봇은 백엔드서 제외).
// + 루트 <html lang>을 현재 로케일로 보정(루트 레이아웃 ko 하드코딩 → 클라서 교정).
export default function TcgTracker() {
  const path = usePathname();
  const params = useParams();
  useEffect(() => { track("pageview", undefined, undefined, "tcg"); }, [path]);
  useEffect(() => {
    const raw = String(params?.lang || defaultLocale);
    const lang = isLocale(raw) ? raw : defaultLocale;
    document.documentElement.lang = localeMeta[lang].htmlLang;
  }, [params]);
  return null;
}
