"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { track } from "../../lib/track";

// 모든 /gbl/* 페이지뷰를 자체 통계로 전송(비로그인 포함). 봇은 백엔드에서 걸러짐.
export default function Tracker() {
  const path = usePathname();
  useEffect(() => { track("pageview"); }, [path]);
  return null;
}
