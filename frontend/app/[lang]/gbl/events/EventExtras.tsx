// 이벤트의 "실제 내용" 블록 — 메인/등장 포켓몬 + 보너스 + 프로모코드.
// 달력 상세와 목록 카드가 같은 걸 쓴다. 피드에 상세가 있는 유형(스포트라이트·커뮤니티 데이)만 내용이 찬다.
import type { ViewEvent } from "./EventsView";
import type { EventsDict } from "./dict";

export default function EventExtras({ e, t, compact }: { e: ViewEvent; t: EventsDict; compact?: boolean }) {
  const has = (e.mons?.length || 0) + (e.bonuses?.length || 0) + (e.codes?.length || 0) + (e.notes?.length || 0);
  if (!has) return null;
  return (
    <div style={{ marginTop: 6 }}>
      {!!e.mons?.length && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "flex-end", marginBottom: e.bonuses?.length ? 7 : 0 }}>
          {e.mons.slice(0, compact ? 4 : 8).map((m, i) => (
            <div key={i} style={{ textAlign: "center", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.image} alt="" width={compact ? 34 : 42} height={compact ? 34 : 42} style={{ objectFit: "contain" }} loading="lazy" />
              {m.shiny && <span style={{ position: "absolute", top: -2, right: -2, fontSize: "0.66rem" }} title={t.eggShiny}>✨</span>}
              {/* 이름은 줄바꿈 허용 — "우주비행사 피카츄"처럼 긴 코스튬명이 말줄임으로 사라지지 않게 */}
              <div style={{ fontSize: "0.64rem", color: "#334155", lineHeight: 1.25, width: 74, wordBreak: "keep-all" }}>{m.name}</div>
            </div>
          ))}
        </div>
      )}
      {!!e.bonuses?.length && (
        <div>
          <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#059669", marginBottom: 3 }}>{t.bonusH}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {e.bonuses.map((b, i) => (
              <span key={i} style={{ fontSize: "0.7rem", fontWeight: 700, color: "#047857", background: "#d1fae5", border: "1px solid #6ee7b7", borderRadius: 999, padding: "2px 8px" }}>{b}</span>
            ))}
          </div>
        </div>
      )}
      {!!e.notes?.length && (
        <ul style={{ margin: "6px 0 0", paddingLeft: "1.05rem", fontSize: "0.76rem", color: "#334155", lineHeight: 1.65 }}>
          {e.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
      {!!e.codes?.length && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontSize: "0.66rem", fontWeight: 800, color: "#7c3aed", marginBottom: 3 }}>{t.codeH}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {e.codes.map((c) => (
              <code key={c} style={{ fontSize: "0.74rem", fontWeight: 800, color: "#5b21b6", background: "#ede9fe", border: "1px solid #c4b5fd", borderRadius: 7, padding: "2px 8px", letterSpacing: "0.3px" }}>{c}</code>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
