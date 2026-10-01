"use client";
// 메타덱 완성하기 — 덱리스트에서 보유 카드를 체크하면, 없는 카드만으로 "어떤 팩을 까야 하는지" 계산.
// 체크는 카드 단위(SET-번호)로 공유 → 한 번 체크하면 모든 덱의 완성도에 반영. 저장은 localStorage(서버 전송 없음).
import { useEffect, useMemo, useState } from "react";
import { deckNeeds, planForCards, deckName, type DeckCard } from "../pack-planner/compute";
import { packName } from "../loc";
import { track } from "../../../../lib/track";
import { type Locale } from "../../../../lib/i18n";

const KEY = "tcg_owned_v1";
const RSYM: Record<string, string> = { C: "◇", U: "◇◇", R: "◇◇◇", RF: "◇◇◇", RR: "◇◇◇◇", AR: "☆", SR: "☆☆", SAR: "☆☆", IM: "☆☆☆", S: "✸", SSR: "✸✸", UR: "👑" };
const TIER_COLOR: Record<string, string> = { S: "#dc2626", A: "#ea580c", B: "#ca8a04", C: "#16a34a", D: "#64748b" };

const L: Record<Locale, {
  intro: string; pickL: string; pick: string; ownedH: string; of: string; done: string; left: string;
  listH: string; checkAll: string; clear: string; missingH: string; packH: string; hit: string; cards: string;
  unob: string; none: string; privacy: string; readyH: string; readySub: string; nearH: string; nearSub: string; noneReady: string;
}> = {
  ko: {
    intro: "덱리스트에서 가진 카드를 체크하면, 없는 카드만 모아 '어떤 팩을 까야 완성되는지' 알려줍니다. 체크는 이 브라우저에만 저장되고 다른 덱에도 그대로 반영됩니다.",
    pickL: "덱 고르기", pick: "덱을 선택하세요…", ownedH: "보유", of: "/", done: "완성!", left: "장 부족",
    listH: "🎴 덱리스트 — 가진 카드 체크", checkAll: "전부 보유", clear: "전부 해제",
    missingH: "📋 부족한 카드", packH: "🎰 이 카드들을 얻으려면", hit: "팩당 적중률", cards: "이 팩에서 나오는 카드",
    unob: "팩에서 안 나오는 카드(프로모 등)", none: "없음", privacy: "체크 기록은 서버에 저장되지 않습니다 (이 브라우저에만 보관).",
    readyH: "✅ 지금 만들 수 있는 덱", readySub: "보유 카드만으로 완성되는 메타덱", nearH: "🔸 거의 다 된 덱", nearSub: "1~3장만 더 있으면 완성", noneReady: "아직 없습니다 — 아래에서 덱을 골라 보유 카드를 체크해 보세요.",
  },
  en: {
    intro: "Check the cards you own in a decklist and we'll collect what's missing and tell you which packs to open. Checks are stored in this browser only and carry over to every deck.",
    pickL: "Pick a deck", pick: "Select a deck…", ownedH: "Owned", of: "/", done: "Complete!", left: " missing",
    listH: "🎴 Decklist — check what you own", checkAll: "Own all", clear: "Clear all",
    missingH: "📋 Missing cards", packH: "🎰 Packs to open for these", hit: "Per-pack hit", cards: "Cards from this pack",
    unob: "Not from packs (promo, etc.)", none: "None", privacy: "Your checks are never sent to a server (kept in this browser).",
    readyH: "✅ Decks you can build now", readySub: "Meta decks completed by the cards you own", nearH: "🔸 Almost there", nearSub: "1–3 cards away", noneReady: "None yet — pick a deck below and check the cards you own.",
  },
  ja: {
    intro: "デッキリストで持っているカードをチェックすると、足りないカードだけを集めて『どのパックを開けば完成するか』を示します。チェックはこのブラウザにのみ保存され、他のデッキにも反映されます。",
    pickL: "デッキ選択", pick: "デッキを選択…", ownedH: "所持", of: "/", done: "完成!", left: "枚不足",
    listH: "🎴 デッキリスト — 所持カードをチェック", checkAll: "全部所持", clear: "全部解除",
    missingH: "📋 足りないカード", packH: "🎰 これらを狙うパック", hit: "パック当たり率", cards: "このパックから出るカード",
    unob: "パックから出ないカード(プロモ等)", none: "なし", privacy: "チェック内容はサーバーに保存されません(このブラウザのみ)。",
    readyH: "✅ 今すぐ組めるデッキ", readySub: "所持カードだけで完成する環境デッキ", nearH: "🔸 あと少しのデッキ", nearSub: "1〜3枚で完成", noneReady: "まだありません — 下でデッキを選んで所持カードをチェックしてください。",
  },
  "zh-TW": {
    intro: "在牌組清單中勾選你擁有的卡片，我們會整理缺少的卡片並告訴你該開哪個卡包。勾選只存在這個瀏覽器，並會套用到所有牌組。",
    pickL: "選擇牌組", pick: "請選擇牌組…", ownedH: "持有", of: "/", done: "完成!", left: "張不足",
    listH: "🎴 牌組清單 — 勾選持有卡片", checkAll: "全部持有", clear: "全部清除",
    missingH: "📋 缺少的卡片", packH: "🎰 要開哪個卡包", hit: "每包命中率", cards: "此卡包會出的卡",
    unob: "卡包不會出的卡(促銷等)", none: "無", privacy: "勾選紀錄不會上傳伺服器（僅存於此瀏覽器）。",
    readyH: "✅ 現在就能組的牌組", readySub: "用持有卡片即可完成的環境牌組", nearH: "🔸 差一點的牌組", nearSub: "再 1〜3 張就完成", noneReady: "還沒有 — 請在下方選擇牌組並勾選持有卡片。",
  },
};

export default function CompleteClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [deckId, setDeckId] = useState("");
  const [ready, setReady] = useState(false);

  // 저장된 보유 체크 복원 — SSR/CSR 불일치를 피하려고 마운트 후 1회.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setOwned(new Set(JSON.parse(raw) as string[]));
    } catch { /* 저장소 접근 실패는 무시(빈 상태로 시작) */ }
    setReady(true);
  }, []);
  const save = (s: Set<string>) => {
    setOwned(new Set(s));
    try { localStorage.setItem(KEY, JSON.stringify([...s])); } catch { /* 용량·프라이빗 모드 */ }
  };

  const needs = useMemo(() => deckNeeds(owned), [owned, ready]);
  const cur = needs.find((d) => d.id === deckId) || null;
  const plan = useMemo(() => (cur && cur.missing.length ? planForCards(cur.missing) : null), [cur?.id, cur?.missing.length, owned]);
  const readyDecks = needs.filter((d) => d.total > 0 && d.missing.length === 0);
  const nearDecks = needs.filter((d) => d.missing.length >= 1 && d.missing.length <= 3).slice(0, 5);
  const cn = (c: { name: string; nm?: Record<string, string> }) => (c.nm && c.nm[lang]) || c.name;

  const toggle = (key: string) => {
    const s = new Set(owned);
    if (s.has(key)) s.delete(key); else s.add(key);
    save(s);
  };
  const setAll = (cards: DeckCard[], on: boolean) => {
    const s = new Set(owned);
    for (const c of cards) { if (on) s.add(c.key); else s.delete(c.key); }
    save(s);
    track("deck_build", "/tcg/deck-complete", on ? "own-all" : "clear", "tcg");
  };

  const box: React.CSSProperties = { background: "#fff", border: "1px solid #fbd8d8", borderRadius: 12, padding: "0.9rem 1rem", marginBottom: 12 };
  const selBox: React.CSSProperties = { fontSize: "0.88rem", padding: "9px 12px", borderRadius: 8, border: "1px solid #fbd8d8", background: "#fff", color: "#0f172a", fontWeight: 700, width: "100%", maxWidth: 420 };

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
      <p style={{ margin: "0 0 14px", fontSize: "0.88rem", color: "#5b4a4a", lineHeight: 1.65 }}>{t.intro}</p>

      {/* 지금 만들 수 있는 덱 / 거의 다 된 덱 — 체크가 쌓일수록 여기가 핵심 화면이 된다 */}
      <div style={box}>
        <div style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0f172a" }}>{t.readyH}</div>
        <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 8 }}>{t.readySub}</div>
        {readyDecks.length === 0 ? (
          <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>{t.noneReady}</div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {readyDecks.map((d) => (
              <button key={d.id} onClick={() => setDeckId(d.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 999, padding: "5px 12px", fontSize: "0.82rem", fontWeight: 700, color: "#166534", cursor: "pointer" }}>
                <span style={{ background: TIER_COLOR[d.tier] || "#64748b", color: "#fff", borderRadius: 5, padding: "0 5px", fontSize: "0.68rem", fontWeight: 900 }}>{d.tier}</span>
                {deckName(d, lang)}
              </button>
            ))}
          </div>
        )}
        {nearDecks.length > 0 && (
          <>
            <div style={{ fontSize: "0.86rem", fontWeight: 900, color: "#0f172a", marginTop: 12 }}>{t.nearH}</div>
            <div style={{ fontSize: "0.74rem", color: "#94a3b8", marginBottom: 8 }}>{t.nearSub}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {nearDecks.map((d) => (
                <button key={d.id} onClick={() => setDeckId(d.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 999, padding: "5px 12px", fontSize: "0.82rem", fontWeight: 700, color: "#92400e", cursor: "pointer" }}>
                  <span style={{ background: TIER_COLOR[d.tier] || "#64748b", color: "#fff", borderRadius: 5, padding: "0 5px", fontSize: "0.68rem", fontWeight: 900 }}>{d.tier}</span>
                  {deckName(d, lang)}
                  <span style={{ color: "#b45309", fontWeight: 900 }}>-{d.missing.length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#64748b", marginBottom: 6 }}>{t.pickL}</label>
      <select value={deckId} onChange={(e) => { setDeckId(e.target.value); if (e.target.value) track("deck_build", "/tcg/deck-complete", `pick:${e.target.value}`, "tcg"); }} style={{ ...selBox, marginBottom: 14 }}>
        <option value="">{t.pick}</option>
        {needs.map((d) => (
          <option key={d.id} value={d.id}>{`[${d.tier}] ${deckName(d, lang)} — ${d.have}${t.of}${d.total}`}</option>
        ))}
      </select>

      {cur && (
        <>
          <div style={box}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              <span style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0f172a" }}>{t.listH}</span>
              <span style={{ marginLeft: "auto", fontSize: "0.82rem", fontWeight: 900, color: cur.missing.length ? "#b45309" : "#16a34a" }}>
                {t.ownedH} {cur.have}{t.of}{cur.total} · {cur.missing.length ? `${cur.missing.length}${t.left}` : t.done}
              </span>
            </div>
            {/* 완성도 바 */}
            <div style={{ height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden", marginBottom: 10 }}>
              <div style={{ width: `${cur.total ? Math.round((cur.have / cur.total) * 100) : 0}%`, height: "100%", background: cur.missing.length ? "#f59e0b" : "#16a34a" }} />
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <button onClick={() => setAll(cur.cards, true)} style={{ fontSize: "0.74rem", fontWeight: 700, color: "#166534", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>{t.checkAll}</button>
              <button onClick={() => setAll(cur.cards, false)} style={{ fontSize: "0.74rem", fontWeight: 700, color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "4px 10px", cursor: "pointer" }}>{t.clear}</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 4 }}>
              {cur.cards.map((c) => {
                const on = owned.has(c.key);
                return (
                  <label key={c.key} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: 8, background: on ? "#f0fdf4" : "#fff", border: `1px solid ${on ? "#bbf7d0" : "#f1f5f9"}`, cursor: "pointer" }}>
                    <input type="checkbox" checked={on} onChange={() => toggle(c.key)} style={{ width: 16, height: 16, accentColor: "#16a34a" }} />
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#0f172a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cn(c)}</span>
                    {c.count > 1 && <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "#64748b" }}>×{c.count}</span>}
                    <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{RSYM[c.r] || c.r}</span>
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#a3a3b3", marginTop: 8 }}>{t.privacy}</div>
          </div>

          {cur.missing.length > 0 && plan && (
            <div style={box}>
              <div style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0f172a", marginBottom: 6 }}>{t.missingH} ({cur.missing.length})</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
                {cur.missing.map((c) => (
                  <span key={c.key} style={{ fontSize: "0.78rem", background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", borderRadius: 999, padding: "3px 10px" }}>
                    {cn(c)}{c.count > 1 ? ` ×${c.count}` : ""} <span style={{ color: "#f87171" }}>{RSYM[c.r] || c.r}</span>
                  </span>
                ))}
              </div>

              <div style={{ fontSize: "0.92rem", fontWeight: 900, color: "#0f172a", marginBottom: 8 }}>{t.packH}</div>
              {plan.packs.slice(0, 4).map((pk, i) => (
                <div key={`${pk.set}-${pk.pack}`} style={{ border: `1px solid ${i === 0 ? "#fbbf24" : "#f1f5f9"}`, background: i === 0 ? "#fffbeb" : "#fff", borderRadius: 10, padding: "9px 11px", marginBottom: 7 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    {i === 0 && <span style={{ fontSize: "0.66rem", fontWeight: 900, color: "#fff", background: "#f59e0b", borderRadius: 6, padding: "1px 7px" }}>#1</span>}
                    <span style={{ fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>{packName(lang, pk.pack)}</span>
                    <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>({pk.set})</span>
                    <span style={{ marginLeft: "auto", fontSize: "0.8rem", fontWeight: 900, color: "#b45309" }}>{t.hit} {(pk.hitRate * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 4 }}>
                    {t.cards}: {pk.cards.map((c) => `${cn(c)} ${(c.p * 100).toFixed(1)}%`).join(" · ")}
                  </div>
                </div>
              ))}
              {plan.unobtainable.length > 0 && (
                <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: 8 }}>
                  {t.unob}: {plan.unobtainable.map((c) => cn(c)).join(" · ")}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
