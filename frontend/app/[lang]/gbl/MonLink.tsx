// 포켓몬 상세 링크 게이트 — indexGate.hasDetailLink가 참이면 <Link>, 아니면 같은 모양의 <div>(이름 표시만, 링크 없음).
// 2026-10-08부터 판정 = "상세 페이지가 존재하는가"(리그 상위 200). 그 전(9/15~10/7)은 "색인 대상인가"였음 — indexGate.LINK_ONLY_INDEXED로 전환.
// 색인(사이트맵·noindex)은 링크와 별개로 indexGate.isMetaMon이 계속 결정 — 링크로 가는 비메타 상세는 noindex 페이지.
// ⚠️ UA·봇 판별 없음 — 사람과 봇에게 완전히 같은 HTML(클로킹 아님).
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { hasDetailLink } from "./indexGate";

export default function MonLink({ league, id, href, style, title, children }: { league: string; id: string; href: string; style?: CSSProperties; title?: string; children: ReactNode }) {
  if (hasDetailLink(league, id)) return <Link href={href} style={style} title={title}>{children}</Link>;
  return <div style={style} title={title} data-mon-nolink="">{children}</div>;
}
