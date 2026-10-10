// 보스의 "지금 등장 중 / 예정" — 일정 피드(ScrapedDuck = LeekDuck 공개 데이터)를 런타임에 받아 판정한다(ISR). ⚠️ 서버 전용.
// 코드에 날짜를 적지 않는다 — 피드가 바뀌면 페이지가 따라 바뀌고, 피드를 못 받으면 "확인 못 함"으로 표시한다.
import type { RaidBoss } from "./bosses";

export const STATUS_REVALIDATE = 3600;
const RAIDS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/raids.json";
const EVENTS_URL = "https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.json";

type FeedBoss = { name: string; tier?: string; canBeShiny?: boolean };
type FeedEvent = { name: string; eventType: string; start: string; end: string; extraData?: { raidbattles?: { bosses?: { name: string; canBeShiny?: boolean }[] } } };
export type BossWindow = { start: string; end: string; raidHour: boolean };   // "YYYY-MM-DDTHH:mm" (한국 시각)
export type BossStatus = { ok: boolean; now: boolean; until: string | null; next: BossWindow[]; shiny: boolean; checked: string };

async function getJson<T>(url: string): Promise<T | null> {
  try { const r = await fetch(url, { next: { revalidate: STATUS_REVALIDATE } }); return r.ok ? ((await r.json()) as T) : null; } catch { return null; }
}
// 한국 시각 "YYYY-MM-DDTHH:mm" — 피드의 현지 시각 문자열과 그대로 크기 비교할 수 있는 꼴.
const kst = (d: Date) => new Date(d.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 16);
// 피드 시각: 대부분 "현지 시각"(시간대 없음), 전 세계 동시 이벤트만 Z(UTC)가 붙는다 → 한국 시각으로.
const toKst = (s: string) => (/Z$/.test(s) ? kst(new Date(s)) : s.slice(0, 16));
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

export async function bossStatus(b: RaidBoss): Promise<BossStatus> {
  const [raids, events] = await Promise.all([getJson<FeedBoss[]>(RAIDS_URL), getJson<FeedEvent[]>(EVENTS_URL)]);
  const now = kst(new Date());
  const names = new Set(b.feed.map(norm));
  const cur = (raids || []).find((x) => names.has(norm(x.name)));
  // 일정 피드의 보스 이름에는 "Shadow"가 안 붙는다 — 섀도우 레이드는 이벤트 이름으로 구분.
  const isShadowEvent = (e: FeedEvent) => /shadow raid/i.test(e.name);
  const wins: BossWindow[] = []; let shiny = !!cur?.canBeShiny;
  for (const e of events || []) {
    const bosses = e.extraData?.raidbattles?.bosses; if (!bosses?.length) continue;
    if ((b.kind === "shadow") !== isShadowEvent(e)) continue;
    const hit = bosses.find((x) => names.has(norm(x.name)) || names.has(norm(`Shadow ${x.name}`)));
    if (!hit) continue;
    const start = toKst(e.start), end = toKst(e.end);
    if (end < now) continue;
    if (hit.canBeShiny) shiny = true;
    wins.push({ start, end, raidHour: /raid hour/i.test(e.name) || e.eventType === "raid-hour" });
  }
  wins.sort((a, b2) => (a.start < b2.start ? -1 : 1));
  const live = wins.filter((w) => !w.raidHour && w.start <= now);
  return {
    ok: !!raids || !!events,
    now: !!cur || live.length > 0,
    until: live.length ? live.map((w) => w.end).sort().pop()! : null,
    next: wins.filter((w) => w.start > now),
    shiny, checked: now.slice(0, 10),
  };
}
