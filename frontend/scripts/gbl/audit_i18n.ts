// 언어팩 정밀 진단 — 4개국어(ko/en/ja/zh-TW) 사전의 키·값을 런타임에 비교.
// 정적 grep이 아니라 실제 모듈을 불러 비교하므로 중첩 객체·배열까지 잡는다.
// 실행: npx esbuild scripts/gbl/audit_i18n.ts --bundle --platform=node --format=cjs \
//         --loader:.json=json --outfile=scripts/gbl/audit_i18n.cjs && node scripts/gbl/audit_i18n.cjs
import { getEvents } from "../../app/[lang]/gbl/events/dict";
import { getBosses } from "../../app/[lang]/gbl/raid/bosses/dict";
import { getRaidType } from "../../app/[lang]/gbl/raid/[type]/dict";
import { getRaidHub } from "../../app/[lang]/gbl/raid/dict";
import { getSchedule } from "../../app/[lang]/gbl/raid/schedule/dict";
import { getTier } from "../../app/[lang]/gbl/tier/[league]/dict";
import { getCmp } from "../../app/[lang]/gbl/cmp/[league]/dict";
import { getMetaHub } from "../../app/[lang]/gbl/meta/dict";
import { getLeagueMeta } from "../../app/[lang]/gbl/meta/[league]/dict";
import { getMoves } from "../../app/[lang]/gbl/moves/dict";
import { getRaidMoves } from "../../app/[lang]/gbl/raid/moves/dict";
import { getBossDict } from "../../app/[lang]/gbl/raid/boss/dict";
import { getNews } from "../../app/[lang]/gbl/news/dict";
import { getGuideIndex, getGuideArticle } from "../../app/[lang]/gbl/guide/dict";
import { getIv } from "../../app/[lang]/gbl/iv/dict";
import { getTrade } from "../../app/[lang]/gbl/trade/dict";
import { getSim } from "../../app/[lang]/gbl/sim/dict";
import { getApp } from "../../app/[lang]/gbl/app/dict";
import { getDict } from "../../app/[lang]/gbl/dictionaries";
import { getPoke } from "../../app/[lang]/gbl/pokemon/[league]/[id]/dict";

const LOCALES = ["ko", "en", "ja", "zh-TW"] as const;
type L = (typeof LOCALES)[number];

const PACKS: Record<string, (l: never) => unknown> = {
  "홈/공용(dictionaries)": getDict,
  "이벤트 달력": getEvents,
  "레이드 보스": getBosses,
  "레이드 타입": getRaidType,
  "레이드 허브": getRaidHub,
  "레이드 일정": getSchedule,
  "티어표": getTier,
  "CMP": getCmp,
  "실측 메타 허브": getMetaHub,
  "실측 메타 리그": getLeagueMeta,
  "기술 도감": getMoves,
  "레이드 기술 도감": getRaidMoves,
  "보스별 레이드 공략": getBossDict,
  "뉴스": getNews,
  "가이드 목록": getGuideIndex,
  "가이드 본문": getGuideArticle,
  "IV": getIv,
  "교환": getTrade,
  "시뮬레이터": getSim,
  "전적앱": getApp,
  "포켓몬 상세": getPoke,
};

// 중첩 키 경로 수집(배열은 길이까지)
function paths(v: unknown, pre = ""): Map<string, string> {
  const out = new Map<string, string>();
  if (v === null || v === undefined) { out.set(pre, "null"); return out; }
  if (Array.isArray(v)) {
    out.set(pre + "[]", `len=${v.length}`);
    v.forEach((x, i) => { for (const [k, t] of paths(x, `${pre}[${i}]`)) out.set(k, t); });
    return out;
  }
  if (typeof v === "object") {
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) for (const [kk, t] of paths(x, pre ? `${pre}.${k}` : k)) out.set(kk, t);
    return out;
  }
  out.set(pre, typeof v === "function" ? "fn" : typeof v);
  return out;
}

const HANGUL = /[가-힣]/;
const KANA = /[぀-ヿ]/;
// 번역하면 안 되는(또는 공용) 값 — 오탐 제외
const ALLOW = /^(GBL Note|gblnote\.com|PvPoke|Pokémon GO|CP|IV|XL|DPS|TDO|CMP|XP|S\/A\/B|L50|L51|[\d\s./×·+\-%()]*)$/;

let problems = 0;
for (const [name, get] of Object.entries(PACKS)) {
  const byLocale = Object.fromEntries(LOCALES.map((l) => [l, paths(get(l as never))])) as Record<L, Map<string, string>>;
  const ko = byLocale.ko;
  const msgs: string[] = [];

  // 1) 키 누락/추가
  for (const l of LOCALES) {
    if (l === "ko") continue;
    const miss = [...ko.keys()].filter((k) => !byLocale[l].has(k));
    const extra = [...byLocale[l].keys()].filter((k) => !ko.has(k));
    if (miss.length) msgs.push(`  [${l}] 키 누락 ${miss.length}: ${miss.slice(0, 6).join(", ")}${miss.length > 6 ? " …" : ""}`);
    if (extra.length) msgs.push(`  [${l}] ko에 없는 키 ${extra.length}: ${extra.slice(0, 6).join(", ")}${extra.length > 6 ? " …" : ""}`);
  }

  // 2) 비-ko 로케일에 한글 잔존
  for (const l of LOCALES) {
    if (l === "ko") continue;
    const d = get(l as never) as Record<string, unknown>;
    const hit: string[] = [];
    for (const [k, t] of paths(d)) {
      if (t !== "string") continue;
      const val = k.split(/[.[\]]/).filter(Boolean).reduce<unknown>((a, c) => (a as Record<string, unknown>)?.[c], d);
      if (typeof val === "string" && HANGUL.test(val)) hit.push(`${k}="${val.slice(0, 40)}"`);
    }
    if (hit.length) msgs.push(`  [${l}] 한글 잔존 ${hit.length}: ${hit.slice(0, 4).join(" / ")}${hit.length > 4 ? " …" : ""}`);
  }

  // 3) ko와 값이 완전히 같은 문자열(번역 누락 의심) — 숫자·브랜드 등은 제외
  for (const l of LOCALES) {
    if (l === "ko") continue;
    const dk = get("ko" as never) as Record<string, unknown>, dl = get(l as never) as Record<string, unknown>;
    const same: string[] = [];
    for (const [k, t] of paths(dk)) {
      if (t !== "string") continue;
      const pick = (o: unknown) => k.split(/[.[\]]/).filter(Boolean).reduce<unknown>((a, c) => (a as Record<string, unknown>)?.[c], o);
      const a = pick(dk), b = pick(dl);
      if (typeof a === "string" && a === b && a.trim() && !ALLOW.test(a.trim())) same.push(`${k}="${a.slice(0, 32)}"`);
    }
    if (same.length) msgs.push(`  [${l}] ko와 동일 ${same.length}: ${same.slice(0, 4).join(" / ")}${same.length > 4 ? " …" : ""}`);
  }

  // 4) ja에 가나가 전혀 없는 긴 문자열(영문 그대로 둔 것)
  {
    const d = get("ja" as never) as Record<string, unknown>;
    const hit: string[] = [];
    for (const [k, t] of paths(d)) {
      if (t !== "string") continue;
      const val = k.split(/[.[\]]/).filter(Boolean).reduce<unknown>((a, c) => (a as Record<string, unknown>)?.[c], d);
      if (typeof val === "string" && val.length > 12 && !KANA.test(val) && !/[一-鿿]/.test(val) && !ALLOW.test(val.trim())) hit.push(`${k}="${val.slice(0, 36)}"`);
    }
    if (hit.length) msgs.push(`  [ja] 일본어 아님(영문 추정) ${hit.length}: ${hit.slice(0, 4).join(" / ")}${hit.length > 4 ? " …" : ""}`);
  }

  if (msgs.length) { problems++; console.log(`\n■ ${name}`); msgs.forEach((m) => console.log(m)); }
  else console.log(`✔ ${name}`);
}
console.log(`\n사전 ${Object.keys(PACKS).length}개 중 지적 ${problems}개`);
