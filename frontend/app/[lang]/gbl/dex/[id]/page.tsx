// 도감 바로가기 — /gbl/dex/<speciesId>?l=<리그> → 그 포켓몬의 상세(도감) 페이지로 리다이렉트.
// 서버 데이터(스냅샷)를 못 쓰는 클라이언트 화면(실측 메타 허브·홈 티저)이 "어느 리그 페이지가 있는지" 몰라도 링크를 걸 수 있게 하는 해석기.
// 서버 렌더 화면은 이 경로를 거치지 않고 dexHub.dexPath/dexPathIn으로 최종 주소를 직접 건다(리다이렉트 한 번 절약).
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLocale, defaultLocale, localizePath, type Locale } from "../../../../../lib/i18n";
import { dexPathIn } from "../../dexHub";

export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function DexRedirect({ params, searchParams }: { params: { lang: string; id: string }; searchParams?: { l?: string } }) {
  const lang: Locale = isLocale(params.lang) ? params.lang : defaultLocale;
  const id = /^[a-z0-9_]{2,60}$/.test(params.id) ? params.id : "";
  const league = searchParams?.l && /^[a-z_]{4,12}$/.test(searchParams.l) ? searchParams.l : "";
  const path = id ? dexPathIn(league, id) : null;
  // 해석 실패(기록에만 있는 표기 등) → 그 리그 티어표로. 404보다 낫다.
  redirect(localizePath(lang, path || `/gbl/tier/${["great", "ultra", "master"].includes(league) ? league : "great"}`));
}
