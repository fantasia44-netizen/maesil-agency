// GBL Note 뉴스 글 데이터 — 운영자가 발행하는 소식·공략(가이드와 같은 방식: 코드에 글을 두고 서버 렌더).
// 게시판(/gbl/board, 이용자 글·noindex)과 별개. 이벤트 달력(/gbl/events)이 "일정표"라면 여기는 "읽는 글".
//
// ── 글 쓰는 법 ───────────────────────────────────────────────────────────
// 1) POSTS 맨 위에 항목 추가(최신 글이 위). slug는 영문 소문자·숫자·하이픈, 한 번 발행하면 바꾸지 않는다(주소가 바뀜).
// 2) ko는 필수. en/ja/zh-TW는 번역이 있을 때만 — 없는 언어에는 그 글이 나가지 않는다(한글이 다른 언어 페이지에 새지 않게).
//    다른 언어 글을 처음 넣으면 locales.ts의 NEWS_LOCALES에도 그 로케일을 추가.
// 3) 숫자는 손으로 적지 말고 자동 블록을 쓴다 — 순위·CP가 사이트 표와 항상 같고, 데이터 갱신 때 글도 같이 바뀐다.
//      { boss: "dialga" }                         보스 카드(타입·약점·반감·100% 개체 CP)
//      { weak: "dialga" }                         같은 카드에서 CP만 뺀 것(레이드가 아닌 경우)
//      { counters: { boss: "dialga", n: 10 } }    추천 딜러 표(약점 타입 딜러표를 합쳐 종합 점수 순)
//      { raidTop: { type: "electric", n: 8, mark: ["zekrom_shadow"] } }   한 타입 딜러표 상위 n(mark = 강조)
//      { dex: "dialga" }                          도감 카드(배틀리그 순위·레이드 기술·IV 링크)
//      { iv: { sid: "zoroark", floor: 0 } }       리그별 1위 개체값 표(IV 체커와 같은 계산). floor = 얻는 방법의 최소 개체값(알·레이드·리서치 10, 야생 0)
// 4) 문장 안의 내부 링크는 [[/gbl/raid/electric|전기 딜러 순위]] 형식. 로케일 접두는 자동으로 붙는다.
// 5) 사실은 확인된 것만. 일정은 이벤트 피드, 보상·코스튬 등은 공식 뉴스에서 교차 확인한 것(events/eventManual.ts의 원칙과 같음).
//    출처는 sources에 적는다. 주소를 모르면 label만.
import type { Locale } from "../../../../lib/i18n";
import { NEWS_LOCALES } from "./locales";

export type Cat = "raid" | "event" | "analysis" | "battle";
export type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { note: string }
  | { table: { head: string[]; rows: string[][] } }
  | { boss: string }
  | { weak: string }
  | { counters: { boss: string; n?: number } }
  | { raidTop: { type: string; n?: number; mark?: string[] } }
  | { dex: string }
  | { iv: { sid: string; floor?: number; n?: number } };
export type PostContent = { title: string; desc: string; keywords?: string[]; blocks: Block[]; tools?: { path: string; label: string }[] };
export type Post = {
  slug: string; cat: Cat;
  published: string;            // YYYY-MM-DD
  updated?: string;
  mons?: string[];              // 머리 그림으로 쓸 포켓몬(speciesId) — 도감 링크가 걸린다
  covers?: string[];            // 이 글이 다룬 소재 키(이벤트 피드의 eventID 등) — scripts/gbl/news_candidates.mjs가 "이미 쓴 소재"를 거를 때 본다
  sources?: { label: string; url?: string }[];
  ko: PostContent; en?: PostContent; ja?: PostContent; "zh-TW"?: PostContent;
};

export const POSTS: Post[] = [
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "pokemon-x-adidas-2026", cat: "event", published: "2026-10-11", mons: ["lucario"], covers: ["pokemon-x-adidas-2026"],
    sources: [
      { label: "포켓몬 GO 공식 뉴스(한국어) — adidas × 포켓몬", url: "https://pokemongo.com/ko/news/pokemon-x-adidas-2026" },
      { label: "일정: LeekDuck 이벤트 피드(ScrapedDuck)", url: "https://leekduck.com/events/pokemon-x-adidas-2026/" },
      { label: "격투 딜러 순위·배틀리그 순위: GBL Note 자체 계산" },
    ],
    ko: {
      title: "포켓몬고 아디다스 시간제한 리서치 — 받는 방법·루카리오 보상·의상 코드 정리 (1월 15일까지)",
      desc: "2027년 1월 15일까지 참여 adidas 매장에서 받을 수 있는 포켓몬고 adidas × 포켓몬 시간제한 리서치의 받는 방법, 보상(루카리오·메가 에너지·의상), 프로모션 코드, 기한을 정리했습니다.",
      keywords: ["포켓몬고 아디다스", "포켓몬고 adidas 리서치", "아디다스 포켓몬 코드", "포켓몬고 루카리오 리서치", "메가 루카리오 에너지"],
      blocks: [
        { p: "adidas × 포켓몬 시간제한 리서치가 9월 25일(금) 오전 10시부터 진행 중이며, 1월 15일(금) 오후 8시까지 받을 수 있습니다. 기간이 길어서 서두를 필요는 없지만, 받는 방법이 평소 이벤트와 달라 따로 정리했습니다." },
        { h: "받는 방법 — 참여 매장에서 앱을 엽니다" },
        { p: "이 리서치는 집에서 자동으로 들어오지 않습니다. 이벤트에 참여하는 adidas 매장에 가서 포켓몬 GO를 열어야 받을 수 있습니다. 어느 매장이 참여하는지는 공식 공지에 걸린 지도에서 확인할 수 있습니다. 공지 본문에는 나라별 매장 목록이 없으니, 가기 전에 지도에서 가까운 매장이 있는지 먼저 확인하세요." },
        { h: "보상" },
        { ul: [
          "의상 아이템: adidas Pokémon Jacket, adidas Pokémon Cap",
          "루카리오와의 만남",
          "루카리오의 메가 에너지",
          "XP와 별의모래",
        ] },
        { p: "과제별 수량은 공식 공지에 나와 있지 않아 이 글에도 적지 않았습니다. 받은 리서치는 2027년 2월 13일 오후 8시까지 과제를 끝내고 보상을 받아야 합니다. 리서치를 받는 기한(1월 15일)과 보상을 받는 기한이 다르다는 점만 기억해 두면 됩니다." },
        { h: "매장에 가지 않아도 받는 의상 — 프로모션 코드" },
        { p: "신발 의상 adidas Pokémon Megaride Shoes는 리서치와 별개입니다. Pokémon GO Web Store에서 코드 ADIDASxPOKEMON을 입력하면 받을 수 있고, 코드는 2027년 1월 15일까지 쓸 수 있습니다. 참여 매장이 가까이 없어도 이 의상은 받을 수 있습니다." },
        { h: "루카리오와 메가 에너지, 어디에 쓸까" },
        { p: "메가 에너지는 루카리오를 메가진화시킬 때 씁니다. 메가 루카리오가 격투 레이드 딜러 가운데 어디쯤인지는 아래 [[/gbl/raid/fighting|격투 딜러 순위]]에서 볼 수 있습니다. 격투는 10월 14일(수)부터 나오는 [[/gbl/raid/boss/dialga|디아루가]]의 약점이기도 합니다." },
        { raidTop: { type: "fighting", n: 10, mark: ["lucario_mega", "lucario"] } },
        { p: "보상으로 만난 루카리오를 어느 리그에 쓸지도 함께 보면 좋습니다. 루카리오의 배틀리그 순위와 추천 기술은 아래 카드에서, 가지고 있는 개체의 리그별 순위는 [[/gbl/iv|IV 순위 체커]]에서 확인하세요." },
        { dex: "lucario" },
        { note: "이벤트 내용은 포켓몬 GO 공식 한국어 뉴스 기준이며(2026년 10월 11일 확인), 시간은 현지 시각입니다. 딜러 순위와 배틀리그 순위는 GBL Note 자체 계산입니다. 다른 일정은 [[/gbl/events|이벤트 달력]]에서 볼 수 있습니다." },
      ],
      tools: [
        { path: "/gbl/events", label: "이벤트 달력" }, { path: "/gbl/raid/fighting", label: "격투 딜러 순위" },
        { path: "/gbl/iv", label: "IV 순위 체커" }, { path: "/gbl/tier/master", label: "마스터리그 티어표" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "zorua-guide-2026-10", cat: "analysis", published: "2026-10-11", mons: ["zorua", "zoroark"], covers: ["mon:zorua:2026-10"],
    sources: [{ label: "일정: LeekDuck 이벤트 피드(ScrapedDuck)" }, { label: "개체값 순위·배틀리그 순위: GBL Note 자체 계산" }],
    ko: {
      title: "포켓몬고 조로아크 개체값 정리 — 리그별 IV표와 배틀리그 순위 (조로아 커뮤니티 데이)",
      desc: "조로아 커뮤니티 데이에 잡은 개체 가운데 무엇을 진화시킬지 고를 때 보는 조로아크의 리그별 개체값 순위표와 배틀리그 순위를 GBL Note 데이터로 정리했습니다.",
      keywords: ["포켓몬고 조로아 개체값", "조로아크 IV", "조로아크 개체값", "조로아 커뮤니티 데이", "조로아크 배틀리그"],
      blocks: [
        { p: "10월 10일(토) 오후 2시부터 5시까지 조로아 커뮤니티 데이가 열렸습니다. 그날 잡아 둔 조로아 가운데 어떤 개체를 조로아크로 진화시킬지 고를 때 볼 표를 정리했습니다." },
        { h: "리그별로 순위가 높은 개체값" },
        { p: "아래 표는 조로아크의 리그별 개체값 순위입니다. 개체값은 공격/방어/체력 순서입니다. 야생에서 잡은 포켓몬은 개체값이 0부터 15까지 고르게 나올 수 있어, 100% 개체가 아니어도 리그에 따라서는 순위가 더 높을 수 있습니다." },
        { iv: { sid: "zoroark", floor: 0 } },
        { p: "슈퍼리그와 하이퍼리그는 CP 제한이 있어서, 표에서 보듯 공격이 낮고 방어와 체력이 높은 개체가 위에 옵니다. 공격 개체값이 낮을수록 같은 CP 안에서 레벨을 더 올릴 수 있기 때문입니다. 마스터리그는 CP 제한이 없어 15/15/15가 가장 좋습니다. 가지고 있는 개체의 정확한 순위는 [[/gbl/iv|IV 순위 체커]]에 개체값을 넣으면 바로 나옵니다." },
        { h: "배틀리그에서의 위치" },
        { p: "조로아크의 리그별 순위와 추천 기술은 아래 카드에서 확인할 수 있습니다. 진화 전에 리그별 티어표에서 어느 리그에 쓸지 먼저 정해 두면 개체를 고르기 쉽습니다." },
        { dex: "zoroark" },
        { note: "개체값 순위는 IV 순위 체커와 같은 계산(리그 CP 제한 안에서 스탯 곱 기준, 레벨 50까지)이며, 순위와 수치는 GBL Note 자체 계산입니다." },
      ],
      tools: [
        { path: "/gbl/iv", label: "IV 순위 체커" }, { path: "/gbl/tier/great", label: "슈퍼리그 티어표" },
        { path: "/gbl/tier/ultra", label: "하이퍼리그 티어표" }, { path: "/gbl/events", label: "이벤트 달력" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "landorus-incarnate-raid-guide-2026-10", cat: "raid", published: "2026-10-11", mons: ["landorus_incarnate_shadow"], covers: ["raid:landorus_incarnate:2026-10"],
    sources: [{ label: "일정: LeekDuck 이벤트 피드(ScrapedDuck)" }, { label: "주말에만 등장: LeekDuck · Snack Nap · Vice 공통" }, { label: "약점·추천 딜러·CP: GBL Note 자체 계산" }],
    ko: {
      title: "포켓몬고 섀도우 랜드로스 레이드 공략 — 약점·추천 딜러·100% CP (11월 3일까지 주말)",
      desc: "10월 7일부터 11월 3일까지 주말마다 5성 섀도우 레이드에 나오는 섀도우 랜드로스(화신폼)의 약점, 추천 딜러 순위, 100% 개체 CP를 GBL Note 데이터로 정리했습니다.",
      keywords: ["포켓몬고 섀도우 랜드로스", "섀도우 랜드로스 레이드", "랜드로스 약점", "섀도우 랜드로스 추천 포켓몬", "섀도우 랜드로스 100 CP"],
      blocks: [
        { p: "섀도우 랜드로스(화신폼)가 10월 7일(수) 오전 6시부터 11월 3일(화) 오후 10시까지 5성 섀도우 레이드에 나옵니다. 기간 내내 열리는 것이 아니라 주말에만 나옵니다. 이로치도 나올 수 있습니다." },
        { boss: "landorus_incarnate" },
        { h: "얼음이 이중 약점입니다" },
        { p: "랜드로스는 땅·비행 타입이라 얼음 기술을 두 타입 모두 약점으로 받습니다. 물도 약점이지만 배율 차이가 커서, 얼음 딜러를 먼저 채우고 모자란 자리를 물 딜러로 메우는 편이 좋습니다. 비행 타입이 섞여 있어도 전기는 약점이 아닙니다. 땅 타입이 전기 기술을 거의 받지 않기 때문입니다." },
        { h: "추천 딜러" },
        { p: "아래는 GBL Note 딜러 티어표의 기술배치를 랜드로스의 타입 상성에 맞춰 다시 계산한 순위입니다. 메가·섀도우를 뺀 순위와 보스가 쓰는 기술은 [[/gbl/raid/boss/landorus_incarnate_shadow|섀도우 랜드로스 레이드 공략 페이지]]에 있습니다. 여기에 없는 포켓몬은 [[/gbl/raid/ice|얼음 딜러 순위]]와 [[/gbl/raid/water|물 딜러 순위]]에서 찾아보세요." },
        { counters: { boss: "landorus_incarnate", n: 10 } },
        { h: "잡은 뒤에는" },
        { p: "잡은 랜드로스의 배틀리그 순위와 레이드 기술배치는 아래 카드에서 확인할 수 있습니다. 섀도우 포켓몬은 공격이 1.2배가 되는 대신 방어가 낮아져, 레이드 딜러로는 일반 개체보다 화력이 높고 버티는 시간은 짧습니다." },
        { dex: "landorus_incarnate" },
        { note: "100% 개체 CP는 레이드에서 잡았을 때(레벨 20, 날씨 부스트 시 레벨 25) 개체값 15/15/15의 CP이며, 섀도우 개체도 같은 값입니다. 순위와 수치는 GBL Note 자체 계산이며, 데이터를 갱신하면 이 글의 표도 함께 바뀝니다." },
      ],
      tools: [
        { path: "/gbl/raid/boss/landorus_incarnate_shadow", label: "섀도우 랜드로스 공략 페이지" }, { path: "/gbl/raid/ice", label: "얼음 딜러 순위" },
        { path: "/gbl/raid/water", label: "물 딜러 순위" }, { path: "/gbl/raid/bosses", label: "지금 보스 · 100% CP" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "weekly-2026-10-12", cat: "event", published: "2026-10-11", mons: ["dialga", "stufful", "sandile"], covers: ["weekly:2026-10-12"],
    sources: [{ label: "일정: LeekDuck 이벤트 피드(ScrapedDuck) — 2026년 10월 11일 확인" }, { label: "약점·CP: GBL Note 자체 계산" }],
    ko: {
      title: "포켓몬고 이번 주 일정 정리 (10월 12~18일) — 디아루가·메가 망나뇽 레이드, 포곰곰 스포트라이트, 깜눈크 부화 데이",
      desc: "10월 12일부터 18일까지 포켓몬고 일정을 한 글에 모았습니다. 수요일 레이드 보스 교체(디아루가·메가 망나뇽), 목요일 포곰곰 스포트라이트 아워, 토요일 깜눈크 부화 데이, 배틀리그 로테이션까지.",
      keywords: ["포켓몬고 이번 주 일정", "포켓몬고 레이드 일정", "디아루가 레이드", "메가 망나뇽 레이드", "포곰곰 스포트라이트 아워", "깜눈크 부화 데이"],
      blocks: [
        { p: "이번 주(10월 12일 월요일 ~ 18일 일요일)에는 수요일에 레이드 보스가 바뀌고, 목요일에 스포트라이트 아워, 토요일에 부화 데이가 있습니다. 날짜순으로 정리했습니다." },
        { h: "레이드 — 수요일에 보스가 바뀝니다" },
        { ul: [
          "10월 13일(화) 오후 10시까지: 5성 [[/gbl/raid/boss/yveltal|이벨타르]], 메가 레이드 [[/gbl/raid/boss/blastoise_mega|메가 거북왕]]",
          "10월 14일(수) 오전 6시 ~ 10월 20일(화) 오후 10시: 5성 [[/gbl/raid/boss/dialga|디아루가]], 메가 레이드 [[/gbl/raid/boss/dragonite_mega|메가 망나뇽]]",
          "10월 14일(수) 오후 6시 ~ 오후 7시: 디아루가 레이드 아워",
          "11월 3일(화) 오후 10시까지, 주말에만: 섀도우 레이드 [[/gbl/raid/boss/landorus_incarnate_shadow|섀도우 랜드로스]] — [[/gbl/news/landorus-incarnate-raid-guide-2026-10|공략 글]]",
        ] },
        { p: "보스 이름을 누르면 약점, 그 보스에 맞춰 계산한 추천 포켓몬, 개체값별 CP를 볼 수 있습니다. 이번 주에 새로 나오는 5성 보스는 디아루가입니다." },
        { boss: "dialga" },
        { p: "디아루가는 드래곤 타입이지만 약점이 격투와 땅뿐이라 평소 드래곤 보스용 파티가 통하지 않습니다. 자세한 내용은 [[/gbl/news/dialga-raid-guide-2026-10|디아루가 레이드 공략 글]]에 정리해 두었습니다." },
        { h: "10월 15일(목) — 포곰곰 스포트라이트 아워" },
        { p: "오후 6시부터 7시까지(현지 시각) 포곰곰이 많이 나옵니다. 보너스는 박사에게 보낼 때 사탕 2배이고, 이로치도 나올 수 있습니다. 사탕 2배는 잡는 것보다 보내는 쪽에 붙는 보너스라, 그 시간 안에 박사에게 보내야 적용됩니다." },
        { h: "10월 17일(토) — 깜눈크 부화 데이" },
        { p: "오전 11시부터 오후 5시까지입니다. 알에서 나온 포켓몬은 레벨 20이고 개체값이 최소 10/10/10이라, 부화한 깜눈크의 CP만 봐도 개체값을 가늠할 수 있습니다. 진화형 악비아르의 리그별 순위는 [[/gbl/iv|IV 순위 체커]]와 티어표에서 확인하세요." },
        { h: "그 밖의 일정" },
        { ul: [
          "10월 12일(월) 오전 6시 ~ 오후 9시: 다이맥스 파라꼬 맥스 먼데이",
          "10월 13일(화) 오전 10시 ~ 10월 19일(월) 오후 8시: 가을 마라톤: 파트너 트렉",
          "11월 3일(화) 오전 10시까지: GO 패스: 10월(진행 중)",
        ] },
        { h: "배틀리그 — 수요일 새벽에 로테이션 변경" },
        { p: "10월 14일(수) 오전 5시에 리그가 바뀝니다. 그 전까지는 슈퍼리그·하이퍼리그·마스터리그가 모두 메가 규칙이고, 이후 일주일은 슈퍼리그, 하이퍼리그(메가), 리틀컵입니다. 리그별 순위는 [[/gbl/tier/great|슈퍼리그 티어표]]와 [[/gbl/schedule|시즌 일정]]에서 볼 수 있습니다." },
        { note: "시간은 모두 현지 시각 기준입니다. 일정은 2026년 10월 11일에 확인한 내용이며, 바뀌면 [[/gbl/events|이벤트 달력]]과 [[/gbl/raid/schedule|레이드 일정]]이 먼저 갱신됩니다. CP와 약점은 GBL Note 자체 계산입니다." },
      ],
      tools: [
        { path: "/gbl/raid/schedule", label: "레이드 일정" }, { path: "/gbl/raid/boss", label: "보스별 레이드 공략" },
        { path: "/gbl/events", label: "이벤트 달력" }, { path: "/gbl/schedule", label: "배틀리그 시즌 일정" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "dialga-raid-guide-2026-10", cat: "raid", published: "2026-10-09", updated: "2026-10-11", mons: ["dialga"], covers: ["raid:dialga:2026-10"],
    sources: [{ label: "일정: LeekDuck 이벤트 피드(ScrapedDuck)" }, { label: "약점·추천 딜러·CP: GBL Note 자체 계산" }],
    ko: {
      title: "포켓몬고 디아루가 레이드 공략 — 약점·추천 딜러·100% CP (10월 14~20일)",
      desc: "10월 14일부터 20일까지 5성 레이드에 나오는 디아루가의 약점, 추천 딜러 순위, 100% 개체 CP, 잡은 뒤의 배틀리그 평가를 GBL Note 데이터로 정리했습니다.",
      keywords: ["포켓몬고 디아루가 레이드", "디아루가 약점", "디아루가 추천 포켓몬", "디아루가 100 CP", "디아루가 레이드 아워"],
      blocks: [
        { p: "디아루가가 10월 14일(수) 오전 6시부터 10월 20일(화) 오후 10시까지 5성 레이드에 나옵니다. 레이드 아워는 10월 14일(수) 오후 6시부터 7시까지입니다. 이로치도 나올 수 있습니다." },
        { boss: "dialga" },
        { h: "약점은 격투와 땅, 두 가지뿐" },
        { p: "디아루가는 강철·드래곤 타입이라 반감되는 타입이 많고, 약점은 격투와 땅 둘뿐입니다. 드래곤 타입이지만 드래곤·얼음·페어리 기술은 약점이 아니니, 평소 드래곤 보스에 쓰던 파티를 그대로 들고 가면 손해를 봅니다." },
        { h: "추천 딜러" },
        { p: "아래는 GBL Note 딜러 티어표의 기술배치를 디아루가의 타입 상성에 맞춰 다시 계산한 순위입니다. 메가·섀도우를 뺀 순위와 디아루가가 쓰는 기술은 [[/gbl/raid/boss/dialga|디아루가 레이드 공략 페이지]]에 있습니다. 여기에 없는 포켓몬은 [[/gbl/raid/fighting|격투 딜러 순위]]와 [[/gbl/raid/ground|땅 딜러 순위]]에서 찾아보세요. 기술 이름을 누르면 그 기술의 레이드 수치를 볼 수 있습니다." },
        { counters: { boss: "dialga", n: 10 } },
        { h: "잡은 뒤에는" },
        { p: "잡은 디아루가의 배틀리그 순위와 레이드 기술배치는 아래 카드에서 바로 확인할 수 있습니다. [[/gbl/pokemon/master/dialga_origin|디아루가(오리진)]]과는 다른 포켓몬이고 순위도 크게 다르니 헷갈리지 마세요." },
        { dex: "dialga" },
        { note: "100% 개체 CP는 레이드에서 잡았을 때(레벨 20, 날씨 부스트 시 레벨 25) 개체값 15/15/15의 CP입니다. 순위와 수치는 GBL Note 자체 계산이며, 데이터를 갱신하면 이 글의 표도 함께 바뀝니다." },
      ],
      tools: [
        { path: "/gbl/raid/schedule", label: "레이드 일정" }, { path: "/gbl/raid/bosses", label: "지금 보스 · 100% CP" },
        { path: "/gbl/raid/fighting", label: "격투 딜러 순위" }, { path: "/gbl/raid/ground", label: "땅 딜러 순위" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "shadow-zekrom-raid-ranking", cat: "analysis", published: "2026-10-09", updated: "2026-10-10", mons: ["zekrom_shadow"],
    sources: [{ label: "순위·수치: GBL Note 자체 계산(딜러 티어표·레이드 기술 도감)" }],
    ko: {
      title: "포켓몬고 섀도우 제크로무 레이드 성능 — 전기 딜러 순위·추천 기술",
      desc: "섀도우 제크로무의 전기 레이드 딜러 순위와 추천 기술배치(차지빔 + 크로스썬더), 일반 제크로무와의 차이, 배틀리그 평가를 GBL Note 데이터로 정리했습니다.",
      keywords: ["포켓몬고 섀도우 제크로무", "그림자 제크로무 레이드", "제크로무 추천 기술", "전기 딜러 순위", "크로스썬더"],
      blocks: [
        { p: "섀도우 제크로무는 차지빔 + 크로스썬더 조합으로, 메가진화를 뺀 전기 딜러 가운데 종합 점수가 가장 높습니다. 아래는 지금 [[/gbl/raid/electric|전기 레이드 딜러 티어표]]의 상위권입니다." },
        { raidTop: { type: "electric", n: 8, mark: ["zekrom_shadow", "zekrom"] } },
        { h: "추천 기술: 차지빔 + 크로스썬더" },
        { p: "레이드에서 차지빔은 위력 7 · 1초 · 에너지 +14, 크로스썬더는 위력 140 · 2초 · 게이지 1칸(에너지 100)입니다. 차지빔 8번으로 크로스썬더를 한 번 쓰는 10초 사이클입니다. 자세한 수치는 [[/gbl/raid/moves/fusion_bolt|크로스썬더 레이드 수치]]와 [[/gbl/raid/moves/charge_beam|차지빔 레이드 수치]]에서 볼 수 있습니다." },
        { p: "크로스썬더는 레거시 기술이라 일반 기술머신으로는 배울 수 없습니다. 크로스썬더가 없다면 전기 스페셜 기술 대안은 [[/gbl/raid/moves/wild_charge|와일드볼트]]입니다." },
        { h: "일반 제크로무와 비교" },
        { p: "같은 기술배치에서 일반 제크로무의 사이클 DPS는 24.4, 섀도우는 29.4입니다. 섀도우는 공격이 1.2배가 되는 대신 방어가 낮아져 버티는 시간은 짧습니다." },
        { h: "드래곤 딜러로는" },
        { p: "용의숨결 + 역린으로 [[/gbl/raid/dragon|드래곤 딜러 순위]]에도 올라 있지만 10위 밖입니다. 섀도우 제크로무의 본업은 전기입니다." },
        { h: "배틀리그에서는" },
        { p: "리그별 순위는 아래 카드에서 확인하세요. 마스터리그에서 어느 개체까지 키울 만한지는 [[/gbl/iv/zekrom_shadow|그림자 제크로무 개체값 타협 분석]]에 정리해 두었습니다(일반 제크로무는 [[/gbl/iv/zekrom|제크로무 개체값 타협 분석]])." },
        { dex: "zekrom" },
        { note: "수치는 레벨 40 · 개체값 15 · 상대 방어 180 · 전기가 약점인 보스 기준의 GBL Note 자체 계산입니다(2026년 10월 9일 기준). 실제 레이드에서는 보스의 타입·기술에 따라 달라집니다." },
      ],
      tools: [
        { path: "/gbl/raid/electric", label: "전기 딜러 순위" }, { path: "/gbl/raid/moves/fusion_bolt", label: "크로스썬더 레이드 수치" },
        { path: "/gbl/iv/zekrom_shadow", label: "그림자 제크로무 개체값 분석" }, { path: "/gbl/raid/moves", label: "레이드 기술 도감" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "fc-seoul-2026", cat: "event", published: "2026-10-09", mons: ["charmander", "charizard"], covers: ["fc-seoul-2026"],
    sources: [{ label: "포켓몬 GO 공식 뉴스(한국어) — FC서울 2026", url: "https://pokemongo.com/ko/news/fc-seoul-2026" }, { label: "리자몽 딜러 순위: GBL Note 자체 계산" }],
    ko: {
      title: "포켓몬고 FC서울 이벤트 2026 — 10월 24일 서울월드컵경기장 보상·레이드 정리",
      desc: "10월 24일 서울월드컵경기장에서 열리는 FC서울 × 포켓몬 GO 2026 이벤트의 시간, 무료 타임 챌린지 보상, 파이리 레이드, 야생 포켓몬, 보너스를 정리했습니다.",
      keywords: ["포켓몬고 FC서울", "FC서울 포켓몬고 이벤트", "서울월드컵경기장 포켓몬고", "포켓몬고 파이리 레이드", "로케이션 배경 리자몽"],
      blocks: [
        { p: "FC서울 × 포켓몬 GO 2026 이벤트가 10월 24일(토) 오전 9시부터 오후 8시까지 서울월드컵경기장 일대에서 열립니다. 현장 부스는 오전 9시부터 오후 2시까지 운영합니다." },
        { h: "무료 타임 챌린지 보상" },
        { ul: ["XP 8,042", "별의모래 5,997", "파이리 사탕 50개", "프리미엄 배틀패스 1개", "이벤트 로케이션 배경이 붙은 리자몽 조우", "보상 수령 기한: 11월 7일(토) 오후 8시"] },
        { h: "레이드와 야생 포켓몬" },
        { ul: ["별 1개 레이드에 파이리 — 이벤트 로케이션 배경이 붙습니다. 리모트 레이드패스는 쓸 수 없습니다.", "야생: 가디 · 아차모 · 델빌 · 레오꼬 · 냐오불(이로치 확률 증가)", "부스터도 야생에 나오며 이로치가 나올 수 있습니다."] },
        { h: "이벤트 보너스" },
        { ul: ["루어모듈 2시간 지속", "Nice 이상으로 잡으면 사탕 증가"] },
        { h: "파이리 사탕 50개, 어디에 쓸까" },
        { p: "리자몽은 메가진화하면 불꽃 타입 레이드 딜러 상위권입니다. 추천 기술배치는 [[/gbl/raid/moves/fire_spin|회오리불꽃]] + [[/gbl/raid/moves/blast_burn|블라스트번]]이고, 블라스트번은 레거시 기술입니다. 아래는 지금 [[/gbl/raid/fire|불꽃 딜러 순위]]입니다." },
        { raidTop: { type: "fire", n: 10, mark: ["charizard_mega_y", "charizard_mega_x", "charizard_shadow"] } },
        { dex: "charizard" },
        { note: "이벤트 내용은 포켓몬 GO 공식 한국어 뉴스 기준입니다. 현장 운영은 당일 사정에 따라 바뀔 수 있으니 출발 전에 공식 공지를 한 번 더 확인하세요." },
      ],
      tools: [
        { path: "/gbl/events", label: "이벤트 달력" }, { path: "/gbl/raid/fire", label: "불꽃 딜러 순위" },
        { path: "/gbl/trade", label: "교환 목록 메이커" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "halloween-2026-part-1", cat: "event", published: "2026-10-09", mons: ["pikachu", "zubat", "sinistea"], covers: ["halloween-2026-part-1"],
    sources: [{ label: "일정: LeekDuck 이벤트 피드(ScrapedDuck)" }, { label: "코스튬·출현 정보: 포켓몬 GO 공식 뉴스 등 2곳 이상 교차 확인" }],
    ko: {
      title: "포켓몬고 할로윈 2026 파트 1 — 일정·신규 코스튬 3종·이로치 정리",
      desc: "10월 27일 시작하는 포켓몬고 할로윈 2026 파트 1의 일정, 신규 코스튬 포켓몬 3종과 만나는 방법, 같은 기간 레이드 보스를 정리했습니다.",
      keywords: ["포켓몬고 할로윈 2026", "포켓몬고 할로윈 이벤트", "할로윈 코스튬 피카츄", "코스튬 주뱃", "코스튬 데인차"],
      blocks: [
        { p: "할로윈 2026 파트 1은 10월 27일(화) 오전 10시부터 11월 1일(일) 오전 10시까지 현지 시각 기준으로 진행됩니다. 이어서 파트 2가 11월 1일(일) 오전 10시부터 11월 5일(목) 오후 8시까지 열립니다." },
        { h: "신규 코스튬 3종" },
        { ul: ["피카츄 — 모자와 케이프", "주뱃 — 실크햇", "데인차 — 리본", "세 종류 모두 이로치가 나올 수 있습니다."] },
        { h: "어디서 만나나" },
        { ul: ["코스튬 피카츄 · 코스튬 데인차: 별 1개 레이드", "코스튬 주뱃: 야생", "야생에는 할로윈 코스튬 해골몽 · 팽도리도 나오고, 둥실라이드는 드물게 나옵니다."] },
        { h: "그 밖에" },
        { ul: ["밤에는 라벤더타운 리믹스 BGM이 나옵니다.", "고딕 의상 아바타 아이템이 추가되며, 이벤트가 끝난 뒤에도 상점에 남습니다."] },
        { h: "같은 기간 레이드" },
        { p: "10월 28일(수)부터 11월 3일(화)까지 5성 레이드에 기라티나(오리진폼), 메가 레이드에 메가 깜까미가 나옵니다. 10월 31일(토) 오후 2시부터 5시까지는 슈퍼 메가 레이드 데이입니다. 보스별 CP와 일정은 [[/gbl/raid/bosses|지금 보스 · 100% CP]]와 [[/gbl/raid/schedule|레이드 일정]]에서 확인하세요." },
        { boss: "giratina_origin" },
        { note: "코스튬 포켓몬의 그림은 게임 에셋이 공개된 뒤 [[/gbl/events|이벤트 달력]]에 반영됩니다. 이 글의 그림은 기본 모습입니다." },
      ],
      tools: [
        { path: "/gbl/events", label: "이벤트 달력" }, { path: "/gbl/raid/schedule", label: "레이드 일정" },
        { path: "/gbl/raid/bosses", label: "지금 보스 · 100% CP" }, { path: "/gbl/schedule", label: "배틀리그 시즌 일정" },
      ],
    },
  },
  // ───────────────────────────────────────────────────────────────────────
  {
    slug: "wild-area-2026-global-dynamax-dialga-palkia", cat: "event", published: "2026-10-09", mons: ["dialga", "palkia"], covers: ["pokemon-go-wild-area-2026-global", "pokemon-go-wild-area-2026-sendai-japan", "pokemon-go-wild-area-2026-mexico-city"],
    sources: [{ label: "일정: LeekDuck 이벤트 피드(ScrapedDuck)" }, { label: "다이맥스 데뷔·로케이션 배경 조건: 포켓몬 GO 공식 뉴스 등 2곳 이상 교차 확인" }],
    ko: {
      title: "포켓몬고 와일드 에어리어 2026 글로벌 — 다이맥스 디아루가·펄기아 데뷔 (11월 14~15일)",
      desc: "11월 14~15일 GO 와일드 에어리어 2026 글로벌에서 처음 등장하는 다이맥스 디아루가·펄기아의 일정, 약점, 로케이션 배경 조건, 잡은 뒤의 배틀리그 평가를 정리했습니다.",
      keywords: ["포켓몬고 와일드 에어리어 2026", "다이맥스 디아루가", "다이맥스 펄기아", "맥스 배틀 디아루가 약점", "와일드 에어리어 글로벌"],
      blocks: [
        { p: "GO 와일드 에어리어 2026 글로벌이 11월 14일(토) 오전 10시부터 11월 15일(일) 오후 6시까지 현지 시각 기준으로 열립니다. 다이맥스 디아루가와 다이맥스 펄기아가 이 이벤트에서 처음 등장합니다." },
        { h: "맥스 배틀 일정" },
        { ul: ["11월 14일(토): 다이맥스 디아루가", "11월 15일(일): 다이맥스 펄기아"] },
        { h: "디아루가와 펄기아의 약점" },
        { weak: "dialga" },
        { weak: "palkia" },
        { p: "맥스 배틀에는 다이맥스·거다이맥스 포켓몬만 내보낼 수 있습니다. 그래서 레이드 딜러 티어표의 순위를 그대로 쓸 수는 없고, 가지고 있는 다이맥스 포켓몬 가운데 위 약점 타입으로 공격할 수 있는 포켓몬을 고르게 됩니다." },
        { h: "로케이션 배경은 현장 이벤트에서만" },
        { p: "로케이션 배경이 붙은 포켓몬은 센다이와 멕시코시티 현장 이벤트의 레이드·맥스 배틀에서만 얻을 수 있습니다. 원격으로 참가하면 대상이 아닙니다. 센다이·도호쿠 현장 이벤트는 11월 6~8일 중 하루, 오전 10시부터 오후 6시(일본 시각)까지 센다이시와 미야기현 일대에서 열리는 티켓 이벤트입니다." },
        { h: "잡은 뒤 배틀리그에서는" },
        { p: "디아루가와 펄기아의 리그별 순위는 아래 카드에서 확인하세요. 오리진폼([[/gbl/pokemon/master/dialga_origin|디아루가(오리진)]] · [[/gbl/pokemon/master/palkia_origin|펄기아(오리진)]])과는 순위가 크게 다릅니다." },
        { dex: "dialga" },
        { dex: "palkia" },
      ],
      tools: [
        { path: "/gbl/events", label: "이벤트 달력" }, { path: "/gbl/tier/master", label: "마스터리그 티어표" },
        { path: "/gbl/guide/type-chart", label: "타입 상성표" },
      ],
    },
  },
];

// ── 조회 ─────────────────────────────────────────────────────────────────
const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const BY_SLUG: Record<string, Post> = Object.assign(Object.create(null), Object.fromEntries(POSTS.map((p) => [p.slug, p])));
export const postBySlug = (slug: string): Post | undefined => BY_SLUG[slug];
export const postContent = (p: Post, lang: Locale): PostContent | undefined => (own(p, lang) ? (p as unknown as Record<string, PostContent>)[lang] : undefined);
export const postLangs = (p: Post): Locale[] => (["ko", "en", "ja", "zh-TW"] as Locale[]).filter((l) => !!postContent(p, l));
// 그 언어로 읽을 수 있는 글(최신순 — 날짜가 같으면 POSTS에 적힌 순서).
export const postsFor = (lang: Locale): Post[] => POSTS.filter((p) => !!postContent(p, lang)).sort((a, b) => (a.published < b.published ? 1 : a.published > b.published ? -1 : 0));

// 글과 NEWS_LOCALES가 어긋나면 알려 준다(다른 언어 글을 넣고 locales.ts를 안 고친 경우 — 그 언어 내비·사이트맵에 뉴스가 안 열림).
if (process.env.NODE_ENV !== "production") {
  const used = new Set(POSTS.flatMap(postLangs));
  for (const l of used) if (!NEWS_LOCALES.includes(l)) console.warn(`[news] ${l} 글이 있는데 NEWS_LOCALES에 없습니다 — news/locales.ts에 추가하세요.`);
}
