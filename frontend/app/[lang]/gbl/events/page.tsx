// 전체 이벤트 달력 — 서버렌더(ISR). ScrapedDuck(LeekDuck) events+eggs 오픈피드 런타임 페치 → 재배포 없이 자동 갱신.
// /gbl/raid/schedule(레이드 중심)와 별개로, 커뮤니티데이·스포트라이트·맥스·부화알까지 전체를 다룸.
import Link from "next/link";
import type { Metadata } from "next";
import EventsView, { type ViewEvent, type ViewEgg } from "./EventsView";
import EventCalendarClient from "./EventCalendarClient";
import { getSDEvents, getSDEggs, localizeEventName, localizeBonus, monLocal, koMon, dexOf } from "../sdEvents";
import { monSprite } from "../sprite";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../lib/i18n";
import { getEvents as getDict, FILTER_TYPES } from "./dict";
import { manualExtra, uiconSprite, LOCAL_EVENTS } from "./eventManual";

export const revalidate = 3600; // 1시간마다 피드 갱신

// 달력에 노출할 eventType → {이모지, 필터버킷}. 여기 없는 타입(season·go-battle-league·go-pass)은 제외.
const TYPE_META: Record<string, { emoji: string; filter: string }> = {
  "community-day": { emoji: "🌟", filter: "community-day" },
  "pokemon-spotlight-hour": { emoji: "🔦", filter: "pokemon-spotlight-hour" },
  // raid-battles(5성/메가/그림자 다주 로테이션)는 /gbl/raid/schedule에서 다룸 — 중복 제외. 시간 특정 아워/데이만.
  "raid-hour": { emoji: "⏰", filter: "raid" },
  "raid-day": { emoji: "🎉", filter: "raid" },
  // 맥스 2종·레이드 아워는 원래 전부 붉은 원형이라 칸 안에서 구별이 안 됐음 → 모양이 다른 글리프로.
  "max-mondays": { emoji: "🟥", filter: "max" },
  "max-battles": { emoji: "💥", filter: "max" },
  "pokemon-go-fest": { emoji: "🎪", filter: "event" },
  "pokemon-go-tour": { emoji: "🎪", filter: "event" },
  "wild-area": { emoji: "🗺️", filter: "event" },
  "event": { emoji: "🎈", filter: "event" },
  "research": { emoji: "🔍", filter: "research" },
  // 장기(2주 초과) — 달력에선 칸을 먹지 않고 "상시 진행" 줄로, 목록에선 진행 중에 노출.
  "season": { emoji: "🌙", filter: "event" },
  "go-pass": { emoji: "🎫", filter: "event" },
};

const EGG_ORDER = ["1 km", "2 km", "5 km", "7 km", "10 km", "12 km"];

const PATH = "/gbl/events";
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
      const x = e.extraData;
      // 메인/등장 포켓몬 — 피드 이미지 URL에서 dex만 뽑아 우리 스프라이트로 그린다(leekduck CDN 미사용).
      const mon = (m: { name: string; image: string; canBeShiny?: boolean }) =>
        ({ name: monLocal(lang, m.name, t), image: monSprite(koMon(m.name), dexOf(m.image)), shiny: !!m.canBeShiny });
      const mons = x?.spotlight?.name && x.spotlight.image
        ? [mon({ name: x.spotlight.name, image: x.spotlight.image, canBeShiny: x.spotlight.canBeShiny })]
        : (x?.communityday?.spawns || []).map((sp) => mon(sp));
      // 피드에 상세가 없는 일반 이벤트는 수동표(eventExtras)로 보강 — 없으면 아무것도 안 붙는다.
      const man = manualExtra(e.eventID);
      const bonuses = [
        ...(x?.spotlight?.bonus ? [x.spotlight.bonus] : []),
        ...(x?.communityday?.bonuses || []).map((b) => b.text),
      ].map((b) => localizeBonus(lang, b));
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
        ...(mons.length || man?.mons?.length
          ? { mons: [...mons, ...(man?.mons || []).map((m) => ({ name: m.name[lang] || m.name.en, image: uiconSprite(m.file), shiny: m.shiny }))] }
          : {}),
        ...(bonuses.length || man?.bonuses ? { bonuses: [...bonuses, ...(man?.bonuses?.[lang] || [])] } : {}),
        ...(x?.promocodes?.length ? { codes: x.promocodes } : {}),
        ...(man?.notes ? { notes: man.notes[lang] || man.notes.en } : {}),
      };
    });

  // 피드에 없는 지역 한정 이벤트(FC서울 등)를 같은 형식으로 합친다. 유형은 피드 eventType을 재사용.
  for (const le of LOCAL_EVENTS) {
    const meta = TYPE_META[le.type];
    if (!meta) continue;
    events.push({
      id: le.id, type: le.type, filterKey: meta.filter, emoji: meta.emoji,
      name: le.name[lang] || le.name.en, start: le.start, end: le.end,
      spawns: le.spawns, research: le.research,
      ...(le.mons?.length ? { mons: le.mons.map((m) => ({ name: m.name[lang] || m.name.en, image: uiconSprite(m.file), shiny: m.shiny })) } : {}),
      ...(le.bonuses ? { bonuses: le.bonuses[lang] || le.bonuses.en } : {}),
      ...(le.notes ? { notes: le.notes[lang] || le.notes.en } : {}),
    });
  }

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
          <>
            <EventCalendarClient events={events} t={t} />
            <EventsView events={events} eggs={eggs} t={t} lang={lang} filterTypes={[...FILTER_TYPES]} />
          </>
        )}

        <div style={{ marginTop: 24, textAlign: "center", fontSize: "0.72rem", color: "#94a3b8" }}>
          {t.footerData}<Link href={L("/gbl/raid/schedule")} style={{ color: "#64748b", textDecoration: "none" }}>{t.footerTierLink}</Link>
        </div>
      </div>
    </div>
  );
}
