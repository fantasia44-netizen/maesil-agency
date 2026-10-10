// 보스별 레이드 공략 — 한 보스를 잡으려는 사람에게 필요한 것만 모은 페이지(서버렌더 · ISR).
//   · 약점·반감 배율, 잡을 때 CP(일반/날씨 부스트), 부스트 날씨          ← 게임 데이터
//   · 이 보스의 타입 상성으로 다시 계산한 추천 포켓몬 순위(raid/counterCalc.ts) ← GBL Note 계산
//   · 지금 등장 중인지·예정 기간(bossStatus.ts)                              ← 일정 피드(런타임)
// 도감 페이지(종족값·배틀리그 성능)와 목적이 다르다 — 여기는 "이 보스를 무엇으로 잡나, 잡으면 CP가 얼마인가".
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AdSlot from "../../../AdSlot";
import DexHub from "../../../DexHubCard";
import JsonLd from "../../../JsonLd";
import CpTable from "../../bosses/CpTable";
import { formDexById } from "../../../sprite";
import { typeLabel, TYPE_COLOR } from "../../../typeLabels";
import { gameName } from "../../../contentI18n";
import { moveName, type Move } from "../../../moves/movesData";
import { raidMoveById } from "../../moves/raidMovesData";
import { bossInfo, baseStats } from "../../../news/newsData";
import { postsFor, postContent } from "../../../news/posts";
import { newsOpen } from "../../../news/locales";
import { counterRows, bossMovePool, multVs, TABLE_GENERATED, RAID_MOVES_GENERATED, type AttackerRow } from "../../counterCalc";
import { RAID_BOSSES, raidBoss, raidBossIds, type RaidBoss } from "../bosses";
import { bossStatus, STATUS_REVALIDATE } from "../bossStatus";
import { getBossDict, WEATHER_OF, type BossDict } from "../dict";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../../lib/i18n";

export const revalidate = STATUS_REVALIDATE;
export function generateStaticParams() { return raidBossIds().map((id) => ({ id })); }

const CARD = "#ffffff", BORDER = "#e3e8f2";
const SPRITE = (sid: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(sid, dex)}.png`;
const SEP: Record<Locale, string> = { ko: "·", en: ", ", ja: "・", "zh-TW": "·" };
const uniq = <T,>(a: T[]): T[] => [...new Set(a)];
const stripForm = (sid: string) => sid.replace(/_(mega(_[xy])?|primal)$/, "");

// 페이지에 쓰는 값을 한 번에 — 메타데이터와 본문이 같은 숫자를 쓰게.
function model(lang: Locale, b: RaidBoss) {
  const t = getBossDict(lang);
  const info = bossInfo(lang, b.sid);
  if (!info) return null;
  const name = b.kind === "shadow" ? t.shadowPrefix + info.name : info.name;
  const counters = counterRows(lang, info.types, 15);
  const plain = counterRows(lang, info.types, 8, true);
  const weakNames = info.weak.map((w) => typeLabel(lang, w.type));
  const bossWeather = uniq(info.types.map((ty) => WEATHER_OF[ty])).map((k) => t.weather[k]);
  const mv = (r: AttackerRow) => `${r.fast ? moveName(lang, r.fast) : r.fastId} + ${r.charged ? moveName(lang, r.charged) : r.chargedId}`;
  return { t, info, name, counters, plain, weakNames, bossWeather, mv };
}

export async function generateMetadata({ params }: { params: { lang: string; id: string } }): Promise<Metadata> {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const b = raidBoss(params.id), m = b ? model(lang, b) : null;
  if (!b || !m) return { title: "GBL Note", robots: { index: false, follow: true } };
  const path = `/gbl/raid/boss/${b.id}`, sep = SEP[lang];
  // 제목은 약점 타입을 최대 3개까지 — 60자를 넘으면 하나씩 줄인다(검색 결과 말줄임 방지).
  const title = [3, 2, 1].map((k) => m.t.metaTitle(m.name, m.weakNames.slice(0, k).join(sep), m.info.cp20)).find((x, i) => x.length <= 60 || i === 2)!;
  const description = m.t.metaDesc(m.name, m.counters.slice(0, 3).map((r) => r.name).join(sep), m.weakNames.join(sep), m.info.cp20, m.info.cp25);
  return {
    title, description,
    alternates: { canonical: localizePath(lang, path), languages: hreflangLanguages(path) },
    openGraph: { title, description, url: localizePath(lang, path), type: "article" },
  };
}

function TypeChip({ lang, type, mult, href, note }: { lang: Locale; type: string; mult?: number; href?: string; note?: string }) {
  const c = TYPE_COLOR[type] || "#94a3b8";
  const st: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", fontWeight: 700, color: "#fff", background: c, padding: "2px 8px", borderRadius: 7, whiteSpace: "nowrap", textDecoration: "none" };
  const inner = <>{typeLabel(lang, type)}{mult != null && <span style={{ opacity: 0.92 }}>×{mult}</span>}{note && <span style={{ opacity: 0.92 }}>· {note}</span>}</>;
  return href ? <Link prefetch={false} href={href} style={st}>{inner}</Link> : <span style={st}>{inner}</span>;
}
function MoveChip({ lang, m, id }: { lang: Locale; m?: Move; id: string }) {
  if (!m) return <span style={{ fontSize: "0.72rem" }}>{id}</span>;
  const c = TYPE_COLOR[m.type] || "#64748b";
  const st: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 10, textDecoration: "none", background: c + "1c", color: c, border: `1px solid ${c}50`, whiteSpace: "nowrap" };
  return raidMoveById(m.id) ? <Link prefetch={false} href={localizePath(lang, `/gbl/raid/moves/${m.slug}`)} style={st}>{moveName(lang, m)}</Link> : <span style={st}>{moveName(lang, m)}</span>;
}

const th: React.CSSProperties = { padding: "7px 6px", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textAlign: "left", whiteSpace: "nowrap", borderBottom: `1px solid ${BORDER}`, background: "#f8fafc" };
const td: React.CSSProperties = { padding: "7px 6px", fontSize: "0.82rem", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const num: React.CSSProperties = { fontFamily: "ui-monospace, monospace", fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" };
const tag = (bg: string, fg: string): React.CSSProperties => ({ fontSize: "0.6rem", fontWeight: 800, color: fg, background: bg, borderRadius: 6, padding: "0 5px", whiteSpace: "nowrap" });

function CounterTable({ lang, t, rows }: { lang: Locale; t: BossDict; rows: AttackerRow[] }) {
  return (
    <div style={{ overflowX: "auto", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12 }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: "center", width: 26 }}>{t.colRank}</th>
            <th style={th}>{t.colMon} · {t.colType}</th>
            <th style={th}>{t.colMoves}</th>
            <th style={{ ...th, textAlign: "right" }}>{t.colDps}</th>
            <th style={{ ...th, textAlign: "right" }}>{t.colOverall}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const mon = (
              <>
                <span style={{ width: 32, height: 32, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", ...(r.shadow ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {r.dex > 0 && <img src={SPRITE(r.sid, r.dex)} alt={r.name} width={32} height={32} loading="lazy" style={{ imageRendering: "pixelated" }} />}
                </span>
                <span style={{ fontSize: "0.84rem", fontWeight: 700, color: r.href ? "#1d4ed8" : "#0f172a" }}>{r.name}</span>
              </>
            );
            const monSt: React.CSSProperties = { display: "flex", alignItems: "center", gap: 7, textDecoration: "none" };
            return (
              <tr key={`${r.sid}-${r.type}`}>
                <td style={{ ...td, textAlign: "center" }}><span style={{ ...num, color: i < 3 ? "#dc2626" : "#94a3b8" }}>{i + 1}</span></td>
                <td style={td}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {r.href ? <Link prefetch={false} href={localizePath(lang, r.href)} style={monSt}>{mon}</Link> : <span style={monSt}>{mon}</span>}
                    {r.upcoming && <span style={tag("#e0f2fe", "#0369a1")}>{t.tagUpcoming}</span>}
                  </div>
                  <div style={{ marginTop: 3, paddingLeft: 39 }}><TypeChip lang={lang} type={r.type} mult={r.mult} /></div>
                </td>
                <td style={td}>
                  <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    <MoveChip lang={lang} m={r.fast} id={r.fastId} /><MoveChip lang={lang} m={r.charged} id={r.chargedId} />
                    {r.legacy && <span style={{ color: "#d97706", fontSize: "0.72rem", fontWeight: 800 }}>★</span>}
                    {r.fastMult < 1 && <span style={tag("#fef3c7", "#92400e")}>{t.fastResisted}</span>}
                  </span>
                </td>
                <td style={{ ...td, textAlign: "right" }}><span style={num}>{r.dps.toFixed(1)}</span></td>
                <td style={{ ...td, textAlign: "right" }}><span style={{ ...num, color: "#c2410c" }}>{r.er.toFixed(1)}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function BossGuidePage({ params }: { params: { lang: string; id: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const b = raidBoss(params.id);
  const m = b ? model(lang, b) : null;
  if (!b || !m) notFound();
  const { t, info, name, counters, plain, weakNames, bossWeather, mv } = m;
  const L = (p: string) => localizePath(lang, p);
  const sep = SEP[lang];
  const status = await bossStatus(b);
  const pool = bossMovePool(b.sid);
  const st = b.kind === "shadow" ? null : baseStats(b.sid);
  const c1 = TYPE_COLOR[info.types[0]] || "#64748b";
  const top10 = counters.slice(0, 10);
  // 약점 타입마다 부스트 날씨(같은 날씨끼리 묶음)
  const atkWeather = uniq(info.weak.map((w) => WEATHER_OF[w.type])).map((k) => ({ w: t.weather[k], types: info.weak.filter((x) => WEATHER_OF[x.type] === k).map((x) => x.type) }));
  const news = newsOpen(lang) ? postsFor(lang).filter((p) => (p.mons || []).some((x) => x === b.sid || x === b.id || x === stripForm(b.sid))).slice(0, 4) : [];
  const others = RAID_BOSSES.filter((x) => x.id !== b.id).map((x) => { const i = bossInfo(lang, x.sid); return i ? { id: x.id, name: (x.kind === "shadow" ? t.shadowPrefix : "") + i.name, color: TYPE_COLOR[i.types[0]] || "#64748b" } : null; }).filter((x): x is { id: string; name: string; color: string } => !!x);

  const weakList = info.weak.map((w) => `${typeLabel(lang, w.type)}(×${w.mult})`).join(sep);
  const faq = [
    { q: t.faqWeakQ(name), a: t.faqWeakA(name, weakList) },
    ...(info.cp20 > 0 ? [{ q: t.faqCpQ(name), a: t.faqCpA(info.cp20, info.cp25, bossWeather.join(sep)) }] : []),
    ...(counters.length >= 3 && plain.length >= 3 ? [{ q: t.faqTopQ(name), a: t.faqTopA(counters.slice(0, 3).map((r) => `${r.name}(${mv(r)})`).join(sep), plain.slice(0, 3).map((r) => r.name).join(sep)) }] : []),
  ];
  const faqLd = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) };

  const wrap: React.CSSProperties = { minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #ffe3d1 0%, transparent 60%), linear-gradient(180deg,#fdf8f4,#f4eef8)", padding: "1.4rem 1rem 4rem" };
  const h2: React.CSSProperties = { fontSize: "1.08rem", fontWeight: 800, color: "#0f172a", margin: "1.6rem 0 6px" };
  const sub: React.CSSProperties = { margin: "0 0 10px", fontSize: "0.76rem", color: "#94a3b8", lineHeight: 1.65 };
  const line: React.CSSProperties = { display: "flex", gap: 8, alignItems: "flex-start", flexWrap: "wrap" };
  const lab: React.CSSProperties = { fontSize: "0.72rem", fontWeight: 800, color: "#64748b", minWidth: 44, paddingTop: 3 };
  const box: React.CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "0.8rem 0.95rem" };
  const stChip = (bg: string, fg: string): React.CSSProperties => ({ fontSize: "0.74rem", fontWeight: 800, color: fg, background: bg, borderRadius: 8, padding: "3px 10px", whiteSpace: "nowrap" });

  return (
    <div style={wrap}>
      <JsonLd data={faqLd} />
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>{t.navRaid}</Link>
          <Link href={L("/gbl/raid/boss")} style={{ marginLeft: "auto", fontSize: "0.82rem", color: "#3b5bdb", textDecoration: "none", fontWeight: 700 }}>{t.navList}</Link>
        </div>

        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{gameName(lang)} {t.h1(name)}</h1>

        {/* 종류 · 등장 여부(일정 피드) */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", margin: "8px 0 10px" }}>
          <span style={stChip("#0f172a", "#fff")}>{t.kind[b.kind]}</span>
          {!status.ok ? <span style={stChip("#f1f5f9", "#64748b")}>{t.stUnknown}</span>
            : status.now ? <span style={stChip("#dcfce7", "#166534")}>{t.stNow}{status.until ? ` · ${t.stUntil(t.date(status.until))}` : ""}</span>
            : status.weekend ? <span style={stChip("#ede9fe", "#5b21b6")}>{t.stWeekend(t.date(status.weekend.start), t.date(status.weekend.end))}</span>
            : status.next.length === 0 ? <span style={stChip("#f1f5f9", "#64748b")}>{t.stNone}</span> : null}
          {status.next.slice(0, 2).map((w) => <span key={w.start} style={stChip("#e0f2fe", "#075985")}>{t.stNext(t.date(w.start), t.date(w.end))}</span>)}
          {status.shiny && <span style={stChip("#fef9c3", "#854d0e")}>✨ {t.shiny}</span>}
        </div>

        <p style={{ margin: "0 0 12px", fontSize: "0.92rem", color: "#475569", lineHeight: 1.75 }}>
          {t.lead(name, info.types.map((ty) => typeLabel(lang, ty)).join(sep), weakNames.join(sep), counters[0] ? `${counters[0].name}(${mv(counters[0])})` : "-")}
        </p>

        {/* 보스 카드 — 타입 · 약점 · 반감 · 잡을 때 CP */}
        <div style={{ background: `linear-gradient(110deg, ${c1}1f, #ffffff 70%)`, border: `1px solid ${c1}55`, borderLeft: `5px solid ${c1}`, borderRadius: 12, padding: "0.85rem 0.95rem", display: "flex", flexDirection: "column", gap: 9 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <span style={{ width: 56, height: 56, display: "flex", alignItems: "center", justifyContent: "center", ...(b.kind === "shadow" ? { background: "radial-gradient(circle, #a855f7ee 0%, #7c3aed99 42%, transparent 72%)", borderRadius: "50%" } : {}) }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={SPRITE(b.sid, info.dex)} alt={name} width={56} height={56} style={{ imageRendering: "pixelated" }} />
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "1.05rem", fontWeight: 900, color: "#0f172a" }}>{name}</div>
              <div style={{ display: "flex", gap: 4, marginTop: 4 }}>{info.types.map((ty) => <TypeChip key={ty} lang={lang} type={ty} />)}</div>
            </div>
          </div>
          <div style={line}><span style={{ ...lab, color: "#16a34a" }}>{t.weakH}</span>
            <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{info.weak.map((w) => <TypeChip key={w.type} lang={lang} type={w.type} mult={w.mult} note={w.mult > 2 ? t.doubleWeak : undefined} href={L(`/gbl/raid/${w.type}`)} />)}</span>
          </div>
          <div style={line}><span style={{ ...lab, color: "#ea580c" }}>{t.resistH}</span>
            <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{info.resist.map((w) => <TypeChip key={w.type} lang={lang} type={w.type} mult={w.mult} />)}</span>
          </div>
          {info.cp20 > 0 && (
            <div style={line}><span style={lab}>CP</span>
              <span style={{ fontSize: "0.86rem", color: "#334155", lineHeight: 1.7 }}>
                {t.cpNormal} <b style={{ ...num, fontSize: "1rem" }}>{info.cp20.toLocaleString("en-US")}</b> · {t.cpBoost} <b style={num}>{info.cp25.toLocaleString("en-US")}</b>
                <span style={{ display: "block", fontSize: "0.74rem", color: "#64748b" }}>{t.bossWeather(bossWeather.join(sep))}</span>
              </span>
            </div>
          )}
          {atkWeather.length > 0 && (
            <div style={line}>
              <span style={{ fontSize: "0.78rem", color: "#475569", lineHeight: 1.8 }}>
                <b style={{ color: "#334155" }}>{t.atkWeatherH}</b>{" — "}
                {atkWeather.map((a, i) => <span key={a.w}>{i > 0 && " / "}{a.w}: {a.types.map((ty) => typeLabel(lang, ty)).join(sep)}</span>)}
              </span>
            </div>
          )}
        </div>

        {/* 추천 포켓몬 — 이 보스의 상성으로 다시 계산한 순위 */}
        <h2 style={h2}>{t.countersH(name)}</h2>
        <p style={sub}>{t.countersSub}</p>
        <CounterTable lang={lang} t={t} rows={counters} />
        <p style={{ margin: "6px 0 0", fontSize: "0.72rem", color: "#94a3b8" }}>{t.legacyNote}</p>

        <AdSlot />

        {plain.length > 0 && (
          <>
            <h2 style={h2}>{t.plainH}</h2>
            <p style={sub}>{t.plainSub}</p>
            <CounterTable lang={lang} t={t} rows={plain} />
          </>
        )}

        {/* 보스가 쓰는 기술 — 스페셜 기술마다 그 타입이 약점인 추천 포켓몬 */}
        {(pool.fast.length > 0 || pool.charged.length > 0) && (
          <>
            <h2 style={h2}>{t.movesH(name)}</h2>
            <p style={sub}>{t.movesSub}</p>
            <div style={{ ...box, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={line}><span style={{ ...lab, minWidth: 84 }}>{t.fast}</span>
                <span style={{ display: "inline-flex", gap: 4, flexWrap: "wrap" }}>{pool.fast.map((mm) => <MoveChip key={mm.id} lang={lang} m={mm} id={mm.id} />)}</span>
              </div>
              <div style={line}><span style={{ ...lab, minWidth: 84 }}>{t.charged}</span>
                <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1, minWidth: 0 }}>
                  {pool.charged.map((mm) => {
                    const hit = top10.filter((r) => multVs(mm.type, r.types) > 1).map((r) => r.name);
                    return (
                      <div key={mm.id} style={{ display: "flex", gap: 7, alignItems: "center", flexWrap: "wrap" }}>
                        <MoveChip lang={lang} m={mm} id={mm.id} />
                        <span style={{ fontSize: "0.74rem", color: hit.length ? "#b45309" : "#94a3b8" }}>{hit.length ? t.weakTo(hit.join(sep)) : t.noneWeak}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* 개체값별 CP — 일반·메가(메가는 기본 폼을 잡는다). 섀도우는 100% CP만 */}
        {info.cp20 > 0 && (
          <>
            <h2 style={h2}>{t.catchH}</h2>
            <p style={sub}>{b.kind === "shadow" ? t.shadowCatch : `${t.catchSub}${b.kind === "mega" || b.kind === "primal" ? " " + t.megaCatch : ""}`}</p>
            {st && <div style={box}><CpTable stats={st} hundoL20={info.cp20} hundoL25={info.cp25} name={name} accent={c1} dex={String(formDexById(b.sid, info.dex))} shiny={status.shiny} /></div>}
          </>
        )}

        {/* 이 포켓몬의 도감·배틀리그·개체값 페이지로 */}
        <DexHub lang={lang} id={stripForm(b.sid)} dex={info.dex} league="" />

        {news.length > 0 && (
          <>
            <h2 style={h2}>{t.newsH}</h2>
            <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.9rem", lineHeight: 1.9 }}>
              {news.map((p) => <li key={p.slug}><Link href={L(`/gbl/news/${p.slug}`)} style={{ color: "#1d4ed8", fontWeight: 700, textDecoration: "none" }}>{postContent(p, lang)?.title}</Link></li>)}
            </ul>
          </>
        )}

        <h2 style={h2}>{t.faqH}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {faq.map((f) => (
            <div key={f.q} style={box}>
              <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "#0f172a" }}>Q. {f.q}</div>
              <div style={{ fontSize: "0.86rem", color: "#475569", lineHeight: 1.75, marginTop: 4 }}>{f.a}</div>
            </div>
          ))}
        </div>

        {/* 자료 기준 — 원본 데이터 / 계산 / 일정을 따로 */}
        <h2 style={h2}>{t.basisH}</h2>
        <ul style={{ ...box, margin: 0, paddingLeft: "1.9rem", fontSize: "0.8rem", color: "#475569", lineHeight: 1.9 }}>
          <li>{t.basisGame(RAID_MOVES_GENERATED)}</li>
          <li>{t.basisCalc(TABLE_GENERATED)}</li>
          <li>{t.basisSchedule(status.checked)}</li>
          <li style={{ color: "#94a3b8" }}>{t.basisSource}</li>
        </ul>

        <h2 style={h2}>{t.othersH}</h2>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {others.map((o) => (
            <Link key={o.id} prefetch={false} href={L(`/gbl/raid/boss/${o.id}`)} style={{ fontSize: "0.78rem", fontWeight: 700, textDecoration: "none", color: o.color, background: o.color + "14", border: `1px solid ${o.color}55`, borderRadius: 12, padding: "3px 10px", whiteSpace: "nowrap" }}>{o.name}</Link>
          ))}
        </div>
        <div style={{ marginTop: 12 }}><Link href={L("/gbl/raid/boss")} style={{ fontSize: "0.82rem", color: "#3b5bdb", fontWeight: 700, textDecoration: "none" }}>{t.listAll}</Link></div>
      </div>
    </div>
  );
}
