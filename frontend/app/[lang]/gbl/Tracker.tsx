"use client";
import { usePathname, useParams } from "next/navigation";
import { useEffect } from "react";
import { track } from "../../../lib/track";
import { isLocale, localeMeta, defaultLocale } from "../../../lib/i18n";

// 모든 /gbl/* 페이지뷰를 자체 통계로 전송(비로그인 포함). 봇은 백엔드에서 걸러짐.
// + 루트 <html lang>을 현재 로케일로 보정(루트 레이아웃은 ko 하드코딩이라 클라이언트서 교정).
export default function Tracker() {
  const path = usePathname();
  const params = useParams();
  useEffect(() => { track("pageview"); }, [path]);
  useEffect(() => {
    const raw = String(params?.lang || defaultLocale);
    const lang = isLocale(raw) ? raw : defaultLocale;
    document.documentElement.lang = localeMeta[lang].htmlLang;
  }, [params]);
  return null;
}
