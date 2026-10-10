// 보스별 레이드 공략 목록 — 종류별(5성·메가·원시·섀도우)로 묶고, 보스마다 약점·100% CP·등장 여부를 한 줄로.
import Link from "next/link";
import type { Metadata } from "next";
import { formDexById } from "../../sprite";
import { typeLabel, TYPE_COLOR } from "../../typeLabels";
import { gameName } from "../../contentI18n";
import { bossInfo } from "../../news/newsData";
import { RAID_BOSSES, type BossKind } from "./bosses";
import { bossStatus, STATUS_REVALIDATE } from "./bossStatus";
import { getBossDict } from "./dict";
import { localizePath, hreflangLanguages, isLocale, defaultLocale, type Locale } from "../../../../../lib/i18n";

export const revalidate = STATUS_REVALIDATE;
const PATH = "/gbl/raid/boss";
const CARD = "#ffffff", BORDER = "#e3e8f2";
const KINDS: BossKind[] = ["t5", "mega", "primal", "shadow"];
const KIND_COLOR: Record<BossKind, string> = { t5: "#dc2626", mega: "#7c3aed", primal: "#c2410c", shadow: "#4b0082" };
const SPRITE = (sid: string, dex: number) => `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${formDexById(sid, dex)}.png`;

export function generateMetadata({ params }: { params: { lang: string } }): Metadata {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getBossDict(lang);
  return {
    title: t.listTitle, description: t.listDesc,
    alternates: { canonical: localizePath(lang, PATH), languages: hreflangLanguages(PATH) },
    openGraph: { title: t.listTitle, description: t.listDesc, url: localizePath(lang, PATH), type: "website" },
  };
}

export default async function BossListPage({ params }: { params: { lang: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const t = getBossDict(lang);
  const L = (p: string) => localizePath(lang, p);
  const rows = (await Promise.all(RAID_BOSSES.map(async (b) => {
    const info = bossInfo(lang, b.sid);
    return info ? { b, info, name: (b.kind === "shadow" ? t.shadowPrefix : "") + info.name, st: await bossStatus(b) } : null;
  }))).filter((x): x is NonNullable<typeof x> => !!x);
  // 등장 중 → 예정 → 그 밖의 순서
  const order = (r: (typeof rows)[number]) => (r.st.now ? 0 : r.st.next.length ? 1 : 2);

  return (
    <div style={{ minHeight: "100dvh", background: "radial-gradient(1000px 500px at 50% -10%, #ffe3d1 0%, transparent 60%), linear-gradient(180deg,#fdf8f4,#f4eef8)", padding: "1.4rem 1rem 4rem" }}>
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ marginBottom: 6 }}><Link href={L("/gbl/raid")} style={{ fontSize: "0.82rem", color: "#ea580c", textDecoration: "none" }}>{t.navRaid}</Link></div>
        <h1 style={{ margin: "0.2rem 0", fontSize: "1.5rem", fontWeight: 900, color: "#0f172a", lineHeight: 1.3 }}>{gameName(lang)} {t.listH1}</h1>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.9rem", color: "#475569", lineHeight: 1.7 }}>{t.listIntro}</p>

        {KINDS.map((k) => {
          const list = rows.filter((r) => r.b.kind === k).sort((a, b) => order(a) - order(b));
          if (!list.length) return null;
          return (
            <div key={k} style={{ marginTop: 20 }}>
              <h2 style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 900, color: "#fff", background: KIND_COLOR[k], borderRadius: 8, padding: "3px 11px" }}>{t.kind[k]}</span>
                <span style={{ fontSize: "0.76rem", fontWeight: 500, color: "#94a3b8" }}>{list.length}</span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 8 }}>
                {list.map(({ b, info, name, st }) => {
                  const c = TYPE_COLOR[info.types[0]] || "#64748b";
                  return (
                    <Link key={b.id} href={L(`/gbl/raid/boss/${b.id}`)} style={{ textDecoration: "none", color: "inherit", background: `linear-gradient(120deg, ${c}1a, ${CARD} 70%)`, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${c}`, borderRadius: 11, padding: "9px 11px", display: "flex", alignItems: "center", gap: 9 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={SPRITE(b.sid, info.dex)} alt={name} width={42} height={42} loading="lazy" style={{ imageRendering: "pixelated", flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{name}</span>
                          {st.now ? <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#166534", background: "#dcfce7", borderRadius: 6, padding: "0 5px" }}>{t.listNow}</span>
                            : st.next.length > 0 ? <span style={{ fontSize: "0.6rem", fontWeight: 800, color: "#075985", background: "#e0f2fe", borderRadius: 6, padding: "0 5px" }}>{t.listSoon} {t.date(st.next[0].start)}</span> : null}
                        </div>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 4 }}>
                          {info.weak.slice(0, 4).map((w) => <span key={w.type} style={{ fontSize: "0.6rem", fontWeight: 700, color: "#fff", background: TYPE_COLOR[w.type] || "#94a3b8", padding: "0 6px", borderRadius: 6 }}>{typeLabel(lang, w.type)}{w.mult > 2 ? " ×2" : ""}</span>)}
                        </div>
                        {info.cp20 > 0 && <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: 3 }}>100% <b style={{ color: "#0f172a" }}>{info.cp20}</b> · {info.cp25}</div>}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
