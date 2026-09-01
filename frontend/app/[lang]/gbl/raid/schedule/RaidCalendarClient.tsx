"use client";
// 달력을 완전 클라이언트 전용으로 마운트(ssr:false) — 서버(UTC)/클라(KST) 시각·타임존 의존 렌더가
// 하이드레이션 불일치를 일으키는 문제를 원천 회피. SSR엔 로딩 플레이스홀더만, 클라에서 신규 마운트.
import dynamic from "next/dynamic";
import type { CalEvent, MajorEvent } from "./RaidCalendar";
import type { ScheduleDict } from "./dict";

const RaidCalendar = dynamic(() => import("./RaidCalendar"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 520 }} aria-hidden />,
});

export default function RaidCalendarClient(props: {
  events: CalEvent[]; majorEvents: MajorEvent[]; today: string; t: ScheduleDict; lang?: string;
}) {
  return <RaidCalendar {...props} />;
}
