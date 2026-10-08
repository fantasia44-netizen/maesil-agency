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
  | { dex: string };
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
    slug: "dialga-raid-guide-2026-10", cat: "raid", published: "2026-10-09", mons: ["dialga"], covers: ["raid:dialga:2026-10"],
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
        { p: "아래는 GBL Note 딜러 티어표에서 격투·땅 타입 공격수를 합쳐 종합 점수 순으로 뽑은 순위입니다. 여기에 없는 포켓몬은 [[/gbl/raid/fighting|격투 딜러 순위]]와 [[/gbl/raid/ground|땅 딜러 순위]]에서 찾아보세요. 기술 이름을 누르면 그 기술의 레이드 수치를 볼 수 있습니다." },
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
    slug: "shadow-zekrom-raid-ranking", cat: "analysis", published: "2026-10-09", mons: ["zekrom_shadow"],
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
        { p: "리그별 순위는 아래 카드에서 확인하세요. 마스터리그에서 어느 개체까지 키울 만한지는 [[/gbl/iv/zekrom|제크로무 개체값 타협 분석]]에 정리해 두었습니다." },
        { dex: "zekrom" },
        { note: "수치는 레벨 40 · 개체값 15 · 상대 방어 180 · 전기가 약점인 보스 기준의 GBL Note 자체 계산입니다(2026년 10월 9일 기준). 실제 레이드에서는 보스의 타입·기술에 따라 달라집니다." },
      ],
      tools: [
        { path: "/gbl/raid/electric", label: "전기 딜러 순위" }, { path: "/gbl/raid/moves/fusion_bolt", label: "크로스썬더 레이드 수치" },
        { path: "/gbl/iv/zekrom", label: "제크로무 개체값 분석" }, { path: "/gbl/raid/moves", label: "레이드 기술 도감" },
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
