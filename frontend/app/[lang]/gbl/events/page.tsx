// 전체 이벤트 달력 — 서버렌더(ISR). ScrapedDuck(LeekDuck) events+eggs 오픈피드 런타임 페치 → 재배포 없이 자동 갱신.
// /gbl/raid/schedule(레이드 중심)와 별개로, 커뮤니티데이·스포트라이트·맥스·부화알까지 전체를 다룸.
import Link from "next/link";
import type { Metadata } from "next";
import EventsView, { type ViewEvent, type ViewEgg } from "./EventsView";
import { getSDEvents, getSDEggs, localizeEventName, monLocal, koMon, dexOf } from "../sdEvents";
import { monSprite } from "../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getEvents as getDict, FILTER_TYPES } from "./dict";

// 1시간마다 피드 갱신 (route는 force-dynamic, 이 값은 피드 fetch 캐시 시간용)
const revalidate = 3600;

// 달력에 노출할 eventType → {이모지, 필터버킷}. 여기 없는 타입(season·go-battle-league·go-pass)은 제외.
const TYPE_META: Record<string, { emoji: string; filter: string }> = {
  "community-day": { emoji: "🌟", filter: "community-day" },
  "pokemon-spotlight-hour": { emoji: "🔦", filter: "pokemon-spotlight-hour" },
  // raid-battles(5성/메가/그림자 다주 로테이션)는 /gbl/raid/schedule에서 다룸 — 중복 제외. 시간 특정 아워/데이만.
  "raid-hour": { emoji: "⏰", filter: "raid" },
  "raid-day": { emoji: "🎉", filter: "raid" },
  "max-mondays": { emoji: "🔴", filter: "max" },
  "max-battles": { emoji: "🔴", filter: "max" },
  "pokemon-go-fest": { emoji: "🎪", filter: "event" },
  "event": { emoji: "🎈", filter: "event" },
  "research": { emoji: "🔍", filter: "research" },
};

const EGG_ORDER = ["1 km", "2 km", "5 km", "7 km", "10 km", "12 km"];

const PATH = "/gbl/events";

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getDict(lang);
  return {
    title: t.metaTitle,
    description: t.metaDesc,
    keywords: t.metaKeywords,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.ogTitle, description: t.ogDesc, url: localizePath(lang, PATH), images: ["/gbl-og.png"], type: "website" },
  };
}

export default async function EventsPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getDict(lang);
  const L = (p: string) => localizePath(lang, p);
  const [rawEvents, rawEggs] = await Promise.all([getSDEvents(revalidate), getSDEggs(revalidate)]);

  const events: ViewEvent[] = rawEvents
    .filter((e) => TYPE_META[e.eventType])
    .map((e) => {
      const meta = TYPE_META[e.eventType];
      return {
        id: e.eventID,
        type: e.eventType,
        filterKey: meta.filter,
        emoji: meta.emoji,
        name: localizeEventName(lang, e.name, t),
        start: e.start,
        end: e.end,
        // 외부(leekduck) 링크·배너 미사용 — 데이터만 재번역해 자체 표시(트래픽 유출·타사 창작물 회피)
        spawns: e.extraData?.generic?.hasSpawns,
        research: e.extraData?.generic?.hasFieldResearchTasks,
      };
    });

  const eggs: ViewEgg[] = EGG_ORDER
    .map((dist) => {
      const mons = rawEggs.filter((g) => g.eggType === dist);
      return {
        dist,
        adventure: mons.length > 0 && mons.every((m) => m.isAdventureSync),
        mons: mons.map((m) => ({
          name: monLocal(lang, m.name, t),
          dex: dexOf(m.image),
          image: monSprite(koMon(m.name), dexOf(m.image)), // 우리 스프라이트(폼 보정) — leekduck CDN 미사용
          shiny: !!m.canBeShiny,
          regional: !!m.isRegional,
          gift: !!m.isGiftExchange,
        })),
      };
    })
    .filter((g) => g.mons.length > 0);

  const wrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "radial-gradient(1000px 500px at 50% -10%, #d1e6ff 0%, transparent 60%), linear-gradient(180deg,#f7faff,#eef2f8)",
    padding: "1.4rem 1rem 4rem",
  };

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ marginBottom: 6 }}>
          <Link href={L("/gbl")} style={{ fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none" }}>{t.navBack}</Link>
        </div>
        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{t.h1}</h1>
        <p style={{ margin: "0.4rem 0 1rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>
          {t.intro.map((s, i) => (s.b ? <b key={i} style={{ color: "#334155" }}>{s.t}</b> : <span key={i}>{s.t}</span>))}
        </p>

        {events.length === 0 && eggs.length === 0 ? (
          <div style={{ textAlign: "center", color: "#94a3b8", padding: "3rem 1rem" }}>{t.loadFail}</div>
        ) : (
          <EventsView events={events} eggs={eggs} t={t} lang={lang} filterTypes={[...FILTER_TYPES]} />
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.72rem", color: "#94a3b8" }}>
          {t.footerData}<Link href={L("/gbl/raid/schedule")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerTierLink}</Link>
        </div>
      </div>
    </div>
  );
}
