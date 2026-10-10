// 보스별 레이드 공략 페이지(/gbl/raid/boss/<id>)의 대상 목록 — 코드에 고정(사이트맵·주소가 피드에 흔들리지 않게).
// "지금 등장 중인지"만 런타임 피드로 판정한다(bossStatus.ts). 보스를 추가하려면 여기에 한 줄.
//   id   : 주소에 쓰는 이름. 섀도우 레이드는 <종 id>_shadow
//   sid  : 타입·종족값·기술을 찾는 포켓몬 id(섀도우는 기본 종, 메가·원시는 그 폼 id)
//   kind : 레이드 종류(표시·묶음용)
//   feed : 일정 피드(ScrapedDuck)에 나오는 영어 이름 — 등장 여부·기간을 이 이름으로 찾는다
export type BossKind = "t5" | "mega" | "primal" | "shadow";
export type RaidBoss = { id: string; sid: string; kind: BossKind; feed: string[] };

export const RAID_BOSSES: RaidBoss[] = [
  // 5성
  { id: "yveltal", sid: "yveltal", kind: "t5", feed: ["Yveltal"] },
  { id: "dialga", sid: "dialga", kind: "t5", feed: ["Dialga"] },
  { id: "palkia", sid: "palkia", kind: "t5", feed: ["Palkia"] },
  { id: "dialga_origin", sid: "dialga_origin", kind: "t5", feed: ["Dialga (Origin)", "Origin Forme Dialga"] },
  { id: "palkia_origin", sid: "palkia_origin", kind: "t5", feed: ["Palkia (Origin)", "Origin Forme Palkia"] },
  { id: "giratina_origin", sid: "giratina_origin", kind: "t5", feed: ["Giratina (Origin)", "Origin Forme Giratina"] },
  { id: "mewtwo", sid: "mewtwo", kind: "t5", feed: ["Mewtwo"] },
  { id: "rayquaza", sid: "rayquaza", kind: "t5", feed: ["Rayquaza"] },
  { id: "groudon", sid: "groudon", kind: "t5", feed: ["Groudon"] },
  { id: "kyogre", sid: "kyogre", kind: "t5", feed: ["Kyogre"] },
  { id: "reshiram", sid: "reshiram", kind: "t5", feed: ["Reshiram"] },
  { id: "zekrom", sid: "zekrom", kind: "t5", feed: ["Zekrom"] },
  { id: "kyurem", sid: "kyurem", kind: "t5", feed: ["Kyurem"] },
  { id: "lugia", sid: "lugia", kind: "t5", feed: ["Lugia"] },
  { id: "ho_oh", sid: "ho_oh", kind: "t5", feed: ["Ho-Oh"] },
  { id: "xerneas", sid: "xerneas", kind: "t5", feed: ["Xerneas"] },
  { id: "lunala", sid: "lunala", kind: "t5", feed: ["Lunala"] },
  { id: "solgaleo", sid: "solgaleo", kind: "t5", feed: ["Solgaleo"] },
  // 메가
  { id: "blastoise_mega", sid: "blastoise_mega", kind: "mega", feed: ["Mega Blastoise"] },
  { id: "dragonite_mega", sid: "dragonite_mega", kind: "mega", feed: ["Mega Dragonite"] },
  { id: "charizard_mega_x", sid: "charizard_mega_x", kind: "mega", feed: ["Mega Charizard X"] },
  { id: "charizard_mega_y", sid: "charizard_mega_y", kind: "mega", feed: ["Mega Charizard Y"] },
  { id: "garchomp_mega", sid: "garchomp_mega", kind: "mega", feed: ["Mega Garchomp"] },
  { id: "rayquaza_mega", sid: "rayquaza_mega", kind: "mega", feed: ["Mega Rayquaza"] },
  // 원시
  { id: "groudon_primal", sid: "groudon_primal", kind: "primal", feed: ["Primal Groudon"] },
  { id: "kyogre_primal", sid: "kyogre_primal", kind: "primal", feed: ["Primal Kyogre"] },
  // 섀도우
  // (그림자 제크로무는 비주기 보상으로 나온 종이라 레이드 보스가 아니다 — 넣지 말 것)
  { id: "landorus_incarnate_shadow", sid: "landorus_incarnate", kind: "shadow", feed: ["Shadow Landorus (Incarnate)", "Shadow Landorus"] },
];

const BY_ID: Record<string, RaidBoss> = Object.assign(Object.create(null), Object.fromEntries(RAID_BOSSES.map((b) => [b.id, b])));
export const raidBoss = (id: string): RaidBoss | undefined => BY_ID[id];
export const raidBossIds = (): string[] => RAID_BOSSES.map((b) => b.id);
// 현재 보스 피드의 이름(예: "Mega Blastoise", "Shadow Landorus (Incarnate)") → 공략 페이지가 있는 보스.
const BY_FEED: Record<string, RaidBoss> = Object.create(null);
for (const b of RAID_BOSSES) for (const n of b.feed) BY_FEED[n.toLowerCase()] = BY_FEED[n.toLowerCase()] || b;
export const raidBossByFeedName = (name: string): RaidBoss | undefined => BY_FEED[name.trim().toLowerCase()];
export const PRIMAL_LABEL: Record<string, string> = { ko: "원시", en: "Primal", ja: "ゲンシ", "zh-TW": "原始" };
export const GUIDE_LABEL: Record<string, string> = { ko: "레이드 공략", en: "Raid guide", ja: "レイド攻略", "zh-TW": "團體戰攻略" };
// 포켓몬 id(딜러표·도감의 speciesId) → 그 보스 공략 페이지 주소. 섀도우 폼 id는 섀도우 레이드 페이지로.
export const bossGuidePath = (sidOrId: string): string | null => (BY_ID[sidOrId] ? `/gbl/raid/boss/${sidOrId}` : null);
