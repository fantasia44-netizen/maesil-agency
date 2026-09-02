"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getUser, logout, apiFetch } from "../../../lib/api";
import { localizePath, isLocale, defaultLocale, type Locale } from "../../../lib/i18n";
import { getDict } from "./dictionaries";
import DATA from "./gbl_data.json";
import CoupangAd from "./CoupangAd";

type Mon = { id: string; dex: number; ko: string; sprite?: string };
const DS = DATA as unknown as { leagues: Record<string, { pokemon: Mon[] }> };
const MON: Record<string, Mon> = {};
for (const lg of Object.values(DS.leagues)) for (const m of lg.pokemon) MON[m.id] = m;
const spriteUrl = (m?: Mon) => m ? (m.sprite || `https://lnhagockqvgradbqvqrh.supabase.co/storage/v1/object/public/gbl-sprites/${m.dex}.png`) : "";

type Teaser = { total: number; top_mons: { speciesId: string; count: number }[] };
type Card = { ic: string; t: string; d: string; href: string; c: string; tag?: string };

function HubCard({ h }: { h: Card }) {
  return (
    <Link href={h.href}
      style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12,
        background: `linear-gradient(120deg, ${h.c}14, #ffffff 72%)`, border: "1px solid #e3e8f2", borderLeft: `4px solid ${h.c}`,
        borderRadius: 14, padding: "14px 15px" }}>
      <span style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 12, background: h.c + "1f",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>{h.ic}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>{h.t}</span>
          {h.tag && <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "#fff", background: h.c, borderRadius: 5, padding: "1px 6px" }}>{h.tag}</span>}
        </div>
        <div style={{ fontSize: "0.76rem", color: "#64748b", lineHeight: 1.45, marginTop: 2 }}>{h.d}</div>
      </div>
      <span style={{ color: h.c, fontWeight: 800, fontSize: "0.9rem" }}>→</span>
    </Link>
  );
}

export default function GblLandingClient() {
  const raw = String(useParams()?.lang || defaultLocale);
  const lang: Locale = isLocale(raw) ? raw : defaultLocale;
  const t = getDict(lang).landing;
  const f = getDict(lang).footer;
  const L = (p: string) => localizePath(lang, p);
  const [authed, setAuthed] = useState(false);
  const [teaser, setTeaser] = useState<Teaser | null>(null);

  useEffect(() => { setAuthed(!!getUser()); }, []);
  useEffect(() => {
    apiFetch<Teaser>("/api/gbl/meta?league=master&days=30", {}, 15000).then(setTeaser).catch(() => setTeaser(null));
  }, []);

  const RAID: Card[] = [
    { ic: "🔥", t: t.cards.raidDealer.t, d: t.cards.raidDealer.d, href: L("/gbl/raid"), c: "#ea580c", tag: t.cards.raidDealer.tag },
    { ic: "🗓️", t: t.cards.raidSchedule.t, d: t.cards.raidSchedule.d, href: L("/gbl/raid/schedule"), c: "#db2777" },
    { ic: "📅", t: t.cards.events.t, d: t.cards.events.d, href: L("/gbl/events"), c: "#0ea5e9", tag: "NEW" },
    { ic: "💯", t: t.cards.raidBosses.t, d: t.cards.raidBosses.d, href: L("/gbl/raid/bosses"), c: "#c2410c" },
    { ic: "💱", t: t.cards.trade.t, d: t.cards.trade.d, href: L("/gbl/trade"), c: "#0ea5e9", tag: "NEW" },
  ];
  const PVP: Card[] = [
    { ic: "🏆", t: t.cards.tier.t, d: t.cards.tier.d, href: L("/gbl/tier/master"), c: "#7c3aed" },
    { ic: "📊", t: t.cards.meta.t, d: t.cards.meta.d, href: L("/gbl/meta"), c: "#059669" },
    { ic: "⚔️", t: t.cards.sim.t, d: t.cards.sim.d, href: L("/gbl/sim"), c: "#4f46e5", tag: "test" },
    { ic: "⚡", t: t.cards.cmp.t, d: t.cards.cmp.d, href: L("/gbl/cmp/master"), c: "#0891b2" },
    { ic: "🧬", t: t.cards.iv.t, d: t.cards.iv.d, href: L("/gbl/iv"), c: "#4f46e5" },
    { ic: "🔬", t: t.cards.ivDeep.t, d: t.cards.ivDeep.d, href: L("/gbl/iv"), c: "#7c3aed", tag: t.cards.ivDeep.tag },
    { ic: "🗓️", t: t.cards.season.t, d: t.cards.season.d, href: L("/gbl/schedule"), c: "#0d9488" },
  ];
  // 회원 전용(로그인 필요) — 각 페이지가 비회원 게이트 표시
  const MEMBER: Card[] = [
    { ic: "📝", t: t.cards.record.t, d: t.cards.record.d, href: L("/gbl/app"), c: "#3b5bdb", tag: t.cards.record.tag },
    { ic: "🏆", t: t.cards.gallery.t, d: t.cards.gallery.d, href: L("/gbl/gallery"), c: "#db2777", tag: t.cards.gallery.tag },
    { ic: "💬", t: t.cards.board.t, d: t.cards.board.d, href: L("/gbl/board"), c: "#0891b2", tag: t.cards.board.tag },
    { ic: "✉️", t: t.cards.inquiry.t, d: t.cards.inquiry.d, href: L("/gbl/board?board=inquiry"), c: "#0ea5e9", tag: t.cards.inquiry.tag },
  ];

  return (
    <div style={{
      minHeight: "100dvh",
      background: "radial-gradient(1000px 500px at 50% -10%, #dbe4ff 0%, transparent 60%), linear-gradient(180deg,#f7f9fd,#eef2fb)",
      padding: "1.6rem 1.2rem 3rem",
    }}>
      <div style={{ width: "100%", maxWidth: 860, margin: "0 auto" }}>
        {/* 헤더 로고 */}
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gbl-icon.png" alt="GBL Note" width={78} height={78} style={{ marginBottom: 6 }} />
          {/* 브랜드 워드마크(시각). 페이지 대표 h1은 서버렌더 미션 히어로(page.tsx)에 있음 — 중복 h1 방지. */}
          <div style={{
            margin: "0 0 8px", fontSize: "clamp(2rem, 9vw, 3.2rem)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1,
            color: "#2540b8",  // solid 색 — 그라디언트 투명텍스트는 SEO 스캐너가 '숨김/없음'으로 오판하므로 사용 안 함
          }}>GBL NOTE</div>
          <p style={{ margin: "0 0 4px", fontSize: "clamp(0.95rem,4.5vw,1.25rem)", fontWeight: 800, color: "#0f172a" }}>
            {t.heroPrefix} <span style={{ color: "#3b5bdb" }}>{t.allInOne}</span>
          </p>
          <p style={{ margin: 0, fontSize: "0.84rem", color: "#64748b" }}>{t.subtitle}</p>
        </div>

        {/* 레이드 파밍러 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#ea580c" }}>🔥 {t.raidHead}</span>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.raidHeadSub}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginBottom: 24 }}>
          {RAID.map((h) => <HubCard key={h.t} h={h} />)}
        </div>

        {/* PvP 배틀러 */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#7c3aed" }}>⚔️ {t.pvpHead}</span>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.pvpHeadSub}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginBottom: 24 }}>
          {PVP.map((h) => <HubCard key={h.t} h={h} />)}
        </div>

        {/* 회원 전용 (로그인 필요) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
          <span style={{ fontSize: "1.1rem", fontWeight: 900, color: "#0891b2" }}>🔒 {t.communityHead}</span>
          <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>{t.communityHeadSub}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10, marginBottom: 24 }}>
          {MEMBER.map((h) => <HubCard key={h.t} h={h} />)}
        </div>

        {/* 라이브 실측 미리보기 */}
        {teaser && teaser.total > 0 && (
          <div style={{ maxWidth: 480, margin: "0 auto 24px", background: "#ffffff", border: "1px solid #e3e8f2", borderRadius: 14, padding: "1rem 1.1rem" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#0f172a" }}>{t.teaserTitle}</span>
              <Link href={L("/gbl/meta")} style={{ fontSize: "0.72rem", color: "#64748b", textDecoration: "none" }}>{t.more}</Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {teaser.top_mons.slice(0, 3).map((mm, i) => {
                const m = MON[mm.speciesId];
                const pct = Math.round((mm.count / teaser.total) * 100);
                return (
                  <div key={mm.speciesId} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#94a3b8", minWidth: 16 }}>{i + 1}</span>
                    <img src={spriteUrl(m)} alt="" width={26} height={26} style={{ imageRendering: "pixelated" }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }} />
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a", flex: 1 }}>{m?.ko || mm.speciesId}</span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 800, color: "#3b5bdb" }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <CoupangAd />

        <p style={{ textAlign: "center", fontSize: "0.75rem", color: "#94a3b8", lineHeight: 2 }}>
          <Link href={L("/gbl/raid")} style={{ color: "#64748b" }}>{f.raidDealer}</Link> ·{" "}
          <Link href={L("/gbl/raid/schedule")} style={{ color: "#64748b" }}>{f.raidSchedule}</Link> ·{" "}
          <Link href={L("/gbl/schedule")} style={{ color: "#64748b" }}>{f.seasonSchedule}</Link> ·{" "}
          <Link href={L("/gbl/gallery")} style={{ color: "#64748b" }}>{f.gallery}</Link> ·{" "}
          <Link href={L("/gbl/board")} style={{ color: "#64748b" }}>{f.board}</Link> ·{" "}
          <Link href={L("/gbl/contact")} style={{ color: "#64748b" }}>{f.contact}</Link> ·{" "}
          <Link href={L("/gbl/guide")} style={{ color: "#64748b" }}>{f.guide}</Link> ·{" "}
          <Link href={L("/gbl/about")} style={{ color: "#64748b" }}>{f.about}</Link> ·{" "}
          <Link href={L("/gbl/privacy")} style={{ color: "#64748b" }}>{f.privacy}</Link> ·{" "}
          <Link href={L("/gbl/terms")} style={{ color: "#64748b" }}>{f.terms}</Link>
          {authed && <> · <button onClick={logout} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "0.75rem", padding: 0 }}>{t.logout}</button></>}
        </p>
        <p style={{ textAlign: "center", fontSize: "0.68rem", color: "#b6bfcc", lineHeight: 1.7, margin: "4px 0 0" }}>
          {t.disclaimer}
        </p>
      </div>
    </div>
  );
}
