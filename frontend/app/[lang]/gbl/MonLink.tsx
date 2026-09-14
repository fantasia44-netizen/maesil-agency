// 포켓몬 상세 링크 게이트 — 메타(색인 대상) 몬만 <Link>, 비메타·표본부족 몬은 같은 모양의 <div>(이름 표시만, 링크 없음).
// 사이트가 구글에 "추천하는" URL 집합을 사이트맵·robots(noindex)·내부 링크 3곳에서 동일하게 압축하기 위함(indexGate.ts 한 소스).
// ⚠️ UA·봇 판별 없음 — 사람과 봇에게 완전히 같은 HTML(클로킹 아님). 비메타 상세 페이지 자체는 그대로 열림(직접 URL·IV찾기·시뮬).
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { hasDetailLink } from "./indexGate";

export default function MonLink({ league, id, href, style, title, children }: { league: string; id: string; href: string; style?: CSSProperties; title?: string; children: ReactNode }) {
  if (hasDetailLink(league, id)) return <Link href={href} style={style} title={title}>{children}</Link>;
  return <div style={style} title={title} data-mon-nolink="">{children}</div>;
}
