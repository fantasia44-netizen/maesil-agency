"use client";
// 달력을 완전 클라이언트 전용으로 마운트(ssr:false) — 서버(UTC)/클라(로컬) 시각 차이로 인한
// 하이드레이션 불일치를 원천 회피(레이드 달력과 같은 방식). SEO 텍스트는 같은 페이지의
// 이벤트 목록(EventsView)이 서버렌더로 이미 제공한다.
import dynamic from "next/dynamic";
import type { EventsDict } from "./dict";
import type { ViewEvent } from "./EventsView";

const EventCalendar = dynamic(() => import("./EventCalendar"), {
  ssr: false,
  loading: () => <div style={{ minHeight: 420 }} aria-hidden />,
});

export default function EventCalendarClient(props: { events: ViewEvent[]; t: EventsDict }) {
  return <EventCalendar {...props} />;
}
