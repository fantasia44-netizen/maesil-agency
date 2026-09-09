"use client";
// 카드 검색·브라우저 — 이름 검색 + 세트·타입 필터 + 팩 찾기. 클라이언트 필터.
// 데이터: cards.json(전 카드·최신 B4a까지). 타입/HP는 있는 카드만 표시. 카드명 영어(데이터 한계).
import { useMemo, useState } from "react";
import CARDS from "../data/cards.json";
import { type Locale } from "../../../../lib/i18n";

type Card = { s: string; n: number; name: string; r: string; packs: string[]; nm?: Record<string, string>; e?: string; w?: string };
const DATA = CARDS as Card[];
const SETS = [...new Set(DATA.map((c) => c.s))];
const ELEMENTS = ["grass", "fire", "water", "lightning", "psychic", "fighting", "darkness", "metal", "dragon", "colorless"];

const ELEMENT_COLOR: Record<string, string> = {
  grass: "#3fa129", fire: "#e62829", water: "#2980ef", lightning: "#d9a900", psychic: "#ef4179",
  fighting: "#ff8000", darkness: "#4b4243", metal: "#5a8a9c", dragon: "#5060e1", colorless: "#9fa19f",
};

const L: Record<Locale, {
  search: string; allSets: string; allTypes: string; showing: (n: number, total: number) => string;
  hp: string; weak: string; pack: string; noResult: string; note: string;
  elem: Record<string, string>;
}> = {
  ko: { search: "카드 이름 검색…", allSets: "전체 세트", allTypes: "전체 타입", showing: (n, t) => `${t.toLocaleString()}장 중 ${n}장`, hp: "HP", weak: "약점", pack: "팩", noResult: "결과 없음", note: "카드명 현지화(일부 트레이너는 영어) · 타입·약점 표시(보유분) · 데이터: 커뮤니티 공개 데이터셋",
    elem: { grass: "풀", fire: "불꽃", water: "물", lightning: "번개", psychic: "에스퍼", fighting: "격투", darkness: "악", metal: "강철", dragon: "드래곤", colorless: "무색" } },
  en: { search: "Search card name…", allSets: "All sets", allTypes: "All types", showing: (n, t) => `${n} of ${t.toLocaleString()}`, hp: "HP", weak: "Weak", pack: "Pack", noResult: "No results", note: "Card names localized (some trainers stay English) · type/weakness where available · data: community open dataset",
    elem: { grass: "Grass", fire: "Fire", water: "Water", lightning: "Lightning", psychic: "Psychic", fighting: "Fighting", darkness: "Darkness", metal: "Metal", dragon: "Dragon", colorless: "Colorless" } },
  ja: { search: "カード名を検索…", allSets: "全セット", allTypes: "全タイプ", showing: (n, t) => `${t.toLocaleString()}枚中 ${n}枚`, hp: "HP", weak: "弱点", pack: "パック", noResult: "結果なし", note: "カード名は現地化(一部トレーナーは英語) · タイプ·弱点を表示(保有分) · データ: コミュニティ公開データセット",
    elem: { grass: "草", fire: "炎", water: "水", lightning: "雷", psychic: "超", fighting: "闘", darkness: "悪", metal: "鋼", dragon: "竜", colorless: "無" } },
  "zh-TW": { search: "搜尋卡片名稱…", allSets: "全部卡包", allTypes: "全部屬性", showing: (n, t) => `${t.toLocaleString()}張中 ${n}張`, hp: "HP", weak: "弱點", pack: "卡包", noResult: "無結果", note: "卡名在地化(部分訓練家為英文) · 顯示屬性·弱點(有資料者) · 資料: 社群公開資料集",
    elem: { grass: "草", fire: "火", water: "水", lightning: "雷", psychic: "超", fighting: "鬥", darkness: "惡", metal: "鋼", dragon: "龍", colorless: "無" } },
};

const LIMIT = 80;
const inputStyle: React.CSSProperties = { fontSize: "0.85rem", padding: "7px 11px", borderRadius: 8, border: "1px solid #eadff2", background: "#fff", color: "#0f172a" };

export default function CardsClient({ lang }: { lang: Locale }) {
  const t = L[lang];
  const [q, setQ] = useState("");
  const [set, setSet] = useState("");
  const [elem, setElem] = useState("");

  const nameOf = (c: Card) => (c.nm && c.nm[lang]) || c.name;
  const filtered = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return DATA.filter((c) =>
      (!ql || c.name.toLowerCase().includes(ql) || nameOf(c).toLowerCase().includes(ql)) &&
      (!set || c.s === set) &&
      (!elem || c.e === elem)
    );
  }, [q, set, elem]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.search} style={{ ...inputStyle, flex: "1 1 200px" }} />
        <select value={set} onChange={(e) => setSet(e.target.value)} style={inputStyle}>
          <option value="">{t.allSets}</option>
          {SETS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
        <button onClick={() => setElem("")} style={{ ...chip(elem === ""), }}>{t.allTypes}</button>
        {ELEMENTS.map((el) => (
          <button key={el} onClick={() => setElem(elem === el ? "" : el)} style={chip(elem === el, ELEMENT_COLOR[el])}>{t.elem[el]}</button>
        ))}
      </div>
      <div style={{ fontSize: "0.76rem", color: "#94a3b8", marginBottom: 8 }}>{t.showing(Math.min(filtered.length, LIMIT), filtered.length)}</div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#cbd5e1", padding: "2rem" }}>{t.noResult}</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 8 }}>
          {filtered.slice(0, LIMIT).map((c) => (
            <div key={`${c.s}-${c.n}`} style={{ background: "#fff", border: "1px solid #eadff2", borderRadius: 10, padding: "0.6rem 0.8rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                {c.e && <span style={{ width: 9, height: 9, borderRadius: 999, background: ELEMENT_COLOR[c.e], flexShrink: 0 }} />}
                <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "#0f172a", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(c)}</span>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#94a3b8" }}>{c.r}</span>
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span>{c.s}·{c.n}</span>
                {c.e && <span>{t.elem[c.e]}</span>}
                {c.w && <span>{t.weak} {c.w}</span>}
              </div>
              {c.packs.length > 0 && (
                <div style={{ marginTop: 4, fontSize: "0.68rem", color: "#b4258f" }}>{t.pack}: {c.packs.join(", ")}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <p style={{ marginTop: 14, fontSize: "0.7rem", color: "#cbd5e1" }}>{t.note}</p>
    </div>
  );
}

function chip(active: boolean, color?: string): React.CSSProperties {
  return {
    fontSize: "0.76rem", fontWeight: 700, cursor: "pointer", borderRadius: 999, padding: "4px 11px",
    border: `1px solid ${active ? (color || "#b4258f") : "#eadff2"}`,
    background: active ? (color || "#b4258f") : "#fff", color: active ? "#fff" : "#64748b",
  };
}
