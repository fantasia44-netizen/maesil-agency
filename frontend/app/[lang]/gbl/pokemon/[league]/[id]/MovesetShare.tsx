"use client";
// 공유/저장 카드 + 기술배치 패널을 묶어 빠른기술 선택 상태를 공유.
// 패널에서 노멀기를 바꾸면 정보카드의 빠른기술·타수도 같은 선택으로 갱신된다.
import { useState, type CSSProperties } from "react";
import PokemonShare, { type PkShare } from "./PokemonShare";
import MovesetPanel, { tausSeq, type FastOpt, type ChargedOpt, type PanelLabels } from "./MovesetPanel";

type ShareBase = Omit<PkShare, "fastMove" | "chargedMoves">;

export default function MovesetShare({ share, fasts, charged, defaultFastId, panelLabels, movesetH, h2Style, cardStyle }: {
  share: ShareBase; fasts: FastOpt[]; charged: ChargedOpt[]; defaultFastId: string;
  panelLabels: PanelLabels; movesetH: string; h2Style: CSSProperties; cardStyle: CSSProperties;
}) {
  const [sel, setSel] = useState(defaultFastId);
  const selFast = fasts.find((f) => f.id === sel) || fasts[0];
  // 카드엔 추천 차지(없으면 전체)를 선택된 빠른기술 기준 타수로 표기.
  const recCharged = charged.filter((c) => c.rec);
  const cardCharged = (recCharged.length ? recCharged : charged).map((c) => ({
    name: c.label, counts: selFast ? tausSeq(c.energy, selFast.gain) : [],
  }));
  return (
    <>
      <PokemonShare {...share} fastMove={selFast?.label} chargedMoves={cardCharged} />
      <h2 style={h2Style}>{movesetH}</h2>
      <div style={cardStyle}>
        <MovesetPanel fasts={fasts} charged={charged} sel={sel} onSel={setSel} labels={panelLabels} />
      </div>
    </>
  );
}
