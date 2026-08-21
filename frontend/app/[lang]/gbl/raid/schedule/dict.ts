// 레이드 스케줄(달력) 페이지 + RaidCalendar 클라이언트 문구(3개국어).
// 템플릿 자리표시자: {y}=연도, {m}=월(숫자), {d}=일, {w}=요일, {month}=월 이름.
type Seg = { t: string; b?: boolean };

export type ScheduleDict = {
  navBack: string; navBosses: string;
  h1: string;
  intro: Seg[];
  loadFail: string;
  footerData: string; footerTierLink: string;
  // 로테이션/종류 라벨(페이지 rotInfo·달력 공용)
  rotStar: string; rotShadow: string; rotMega: string;
  rotStarTitle: string; rotShadowTitle: string; rotMegaTitle: string;
  kindHour: string; kindDay: string;
  // 이벤트명 접미(koEventName)
  sfxSuperMega: string; sfxMega: string; sfxRaidHour: string; sfxRaidDay: string;
  // 폼 접두(koMon)
  pfx: { mega: string; shadow: string; alola: string; galar: string; hisui: string; paldea: string };
  // 달력 UI
  weekdays: string[];
  months: string[];
  navMonth: string;
  legendMain: string; legendMega: string; legendShadow: string; legendDay: string; legendHour: string;
  selDateTitle: string;
  noSpecial: string; bossTapHint: string;
  // 다가오는 특별 이벤트(레이드 아워·데이) 리스트 + 타입별 상세 안내
  upcomingSpecialH: string; upcomingDateFmt: string;
  guideHour: string; guideDay: string; guideSuperMega: string; guideNote: string;
  monthBossesH: string; cpTableArrow: string;
  rotationH: string; live: string; upcoming: string; liveNowH: string; endsWord: string;
  saveBtn: string; building: string;
  share: string; save: string; close: string;
  imgTitle: string; imgFooter: string; imgShareTitle: string; imgFile: string;
  cpModalSub: string; cpModalNoData: string;
  // 메타
  metaTitle: string; metaDesc: string; metaKeywords: string[]; ogTitle: string; ogDesc: string;
};

const ko: ScheduleDict = {
  navBack: "← 레이드 딜러 티어", navBosses: "🗓️ 지금 보스 · CP →",
  h1: "레이드 스케줄",
  intro: [
    { t: "5성 전설·메가·섀도우 레이드", b: true },
    { t: " 로테이션과 " },
    { t: "레이드 아워·데이", b: true },
    { t: " 일정입니다. 날짜를 누르면 그날 레이드가 나오고, 보스를 누르면 CP·약점 딜러로 이동합니다." },
  ],
  loadFail: "일정을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
  footerData: "일정 데이터: LeekDuck(ScrapedDuck) · 시간은 현지 기준 · ", footerTierLink: "추천 딜러 티어표",
  rotStar: "5성 레전드", rotShadow: "그림자 5성", rotMega: "메가",
  rotStarTitle: "5성 레전드", rotShadowTitle: "그림자 5성", rotMegaTitle: "메가 레이드",
  kindHour: "레이드 아워", kindDay: "레이드 데이",
  sfxSuperMega: "슈퍼 메가 레이드 데이", sfxMega: "메가 레이드 데이", sfxRaidHour: "레이드 아워", sfxRaidDay: "레이드 데이",
  pfx: { mega: "메가 ", shadow: "섀도우 ", alola: "알로라 ", galar: "가라르 ", hisui: "히스이 ", paldea: "팔데아 " },
  weekdays: ["일", "월", "화", "수", "목", "금", "토"],
  months: ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"],
  navMonth: "{y}년 {m}월",
  legendMain: "🖼️ 날짜 그림 = 5성 전설", legendMega: "🔷 메가", legendShadow: "🌑 그림자", legendDay: "🎉 레이드 데이", legendHour: "⏰ 레이드 아워",
  selDateTitle: "{m}월 {d}일 ({w}) 레이드",
  noSpecial: "이 날 특별 레이드 일정이 없습니다.", bossTapHint: "보스를 누르면 100% CP·약점 딜러를 볼 수 있어요.",
  upcomingSpecialH: "🎉 다가오는 레이드 아워·데이", upcomingDateFmt: "{m}/{d}({w})",
  guideHour: "매주 특정 요일 저녁(보통 18~19시, 현지시간) 1시간 동안 거의 모든 체육관에 해당 보스가 동시 등장합니다. 짧은 시간에 여러 마리를 잡을 수 있어 전설 파밍·색이 다른 개체(이로치) 노리기에 좋습니다.",
  guideDay: "보통 주말 3시간 동안 특정 보스가 집중 등장하고, 무료 레이드패스가 추가 지급되며 색이 다른 개체(이로치) 확률이 크게 올라갑니다.",
  guideSuperMega: "메가 레이드에 집중하는 특별 데이입니다. 무료 레이드패스 + 메가에너지 대량 획득 + 색이 다른 개체(이로치) 확률↑ 혜택이 주어집니다. 메가진화 준비·메가에너지 파밍의 기회예요.",
  guideNote: "※ 정확한 보너스·시간은 이벤트마다 다르니 공식 공지를 확인하세요.",
  monthBossesH: "📋 {m}월 등장 보스", cpTableArrow: "CP표 →",
  rotationH: "🔥 보스 로테이션 기간", live: "진행 중", upcoming: "예정", liveNowH: "🔥 지금 열리는 레이드", endsWord: "종료",
  saveBtn: "📅 {m}월 달력 이미지 저장·공유", building: "이미지 생성 중…",
  share: "📤 공유", save: "💾 저장", close: "닫기",
  imgTitle: "포켓몬고 {m}월 레이드", imgFooter: "포켓몬GO 레이드 일정", imgShareTitle: "포켓몬고 {m}월 레이드 일정", imgFile: "gbl-raid-{m}월.png",
  cpModalSub: "개체값별 포획 CP", cpModalNoData: "이 보스의 CP 데이터가 아직 준비되지 않았어요.",
  metaTitle: "포켓몬고 레이드 스케줄 달력 · 5성·메가 로테이션 | GBL Note",
  metaDesc: "포켓몬 GO 레이드 일정을 달력으로. 5성 전설·메가·섀도우 레이드 로테이션 기간과 레이드 아워·레이드 데이를 날짜별로 확인. 보스 100% CP·약점 딜러 연결. 자동 업데이트.",
  metaKeywords: ["포켓몬고 레이드 일정", "레이드 달력", "5성 레이드 로테이션", "메가 레이드 일정", "레이드 아워", "레이드 데이"],
  ogTitle: "포켓몬고 레이드 스케줄 달력", ogDesc: "5성·메가 로테이션 + 레이드 아워·데이",
};

const en: ScheduleDict = {
  navBack: "← Raid attacker tiers", navBosses: "🗓️ Current bosses · CP →",
  h1: "Raid Schedule",
  intro: [
    { t: "5-star legendary, Mega and Shadow raid", b: true },
    { t: " rotations plus " },
    { t: "Raid Hour and Raid Day", b: true },
    { t: " times. Tap a date to see that day's raids; tap a boss for its CP and weakness attackers." },
  ],
  loadFail: "Couldn't load the schedule. Please try again shortly.",
  footerData: "Schedule data: LeekDuck (ScrapedDuck) · times are local · ", footerTierLink: "Recommended attacker tiers",
  rotStar: "5★ Legendary", rotShadow: "Shadow 5★", rotMega: "Mega",
  rotStarTitle: "5★ Legendary", rotShadowTitle: "Shadow 5★", rotMegaTitle: "Mega Raid",
  kindHour: "Raid Hour", kindDay: "Raid Day",
  sfxSuperMega: "Super Mega Raid Day", sfxMega: "Mega Raid Day", sfxRaidHour: "Raid Hour", sfxRaidDay: "Raid Day",
  pfx: { mega: "Mega ", shadow: "Shadow ", alola: "Alolan ", galar: "Galarian ", hisui: "Hisuian ", paldea: "Paldean " },
  weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  navMonth: "{month} {y}",
  legendMain: "🖼️ Date icon = 5★ legendary", legendMega: "🔷 Mega", legendShadow: "🌑 Shadow", legendDay: "🎉 Raid Day", legendHour: "⏰ Raid Hour",
  selDateTitle: "{month} {d} ({w}) raids",
  noSpecial: "No special raids scheduled on this day.", bossTapHint: "Tap a boss to see its 100% CP and weakness attackers.",
  upcomingSpecialH: "🎉 Upcoming Raid Hours & Days", upcomingDateFmt: "{m}/{d} ({w})",
  guideHour: "For one hour on a set evening (usually 6–7 PM local time), the featured boss appears in almost every gym at once — a great window to farm several, chase legendaries and hunt shinies.",
  guideDay: "Usually a 3-hour weekend window where a specific boss appears frequently, with extra free raid passes and greatly boosted shiny odds.",
  guideSuperMega: "A special day focused on Mega Raids — extra free passes, big Mega Energy rewards and boosted shiny odds. A prime chance to prep Mega Evolutions and farm Mega Energy.",
  guideNote: "※ Exact bonuses and times vary per event — check the official announcement.",
  monthBossesH: "📋 Bosses in {month}", cpTableArrow: "CP table →",
  rotationH: "🔥 Boss rotation periods", live: "Live", upcoming: "Upcoming", liveNowH: "🔥 Live raids now", endsWord: "ends",
  saveBtn: "📅 Save/Share {month} calendar image", building: "Generating image…",
  share: "📤 Share", save: "💾 Save", close: "Close",
  imgTitle: "Pokémon GO {month} Raids", imgFooter: "Pokémon GO raid schedule", imgShareTitle: "Pokémon GO {month} raid schedule", imgFile: "gbl-raid-{m}.png",
  cpModalSub: "Catch CP by IV", cpModalNoData: "CP data for this boss isn't ready yet.",
  metaTitle: "Pokémon GO Raid Schedule Calendar · 5★ & Mega Rotation | GBL Note",
  metaDesc: "Pokémon GO raid schedule as a calendar. See 5-star legendary, Mega and Shadow raid rotation periods plus Raid Hour and Raid Day by date. Links to boss 100% CP and weakness attackers. Auto-updated.",
  metaKeywords: ["pokemon go raid schedule", "raid calendar", "5-star raid rotation", "mega raid schedule", "raid hour", "raid day"],
  ogTitle: "Pokémon GO Raid Schedule Calendar", ogDesc: "5★ & Mega rotation + Raid Hour & Day",
};

const ja: ScheduleDict = {
  navBack: "← レイドアタッカーティア", navBosses: "🗓️ 現在のボス · CP →",
  h1: "レイドスケジュール",
  intro: [
    { t: "5★伝説・メガ・シャドウレイド", b: true },
    { t: "のローテーションと" },
    { t: "レイドアワー・デイ", b: true },
    { t: "の日程です。日付を押すとその日のレイド、ボスを押すとCP・弱点アタッカーへ移動します。" },
  ],
  loadFail: "日程を読み込めませんでした。しばらくして再度お試しください。",
  footerData: "日程データ: LeekDuck(ScrapedDuck) · 時間は現地基準 · ", footerTierLink: "おすすめアタッカーティア表",
  rotStar: "5★伝説", rotShadow: "シャドウ5★", rotMega: "メガ",
  rotStarTitle: "5★伝説", rotShadowTitle: "シャドウ5★", rotMegaTitle: "メガレイド",
  kindHour: "レイドアワー", kindDay: "レイドデイ",
  sfxSuperMega: "スーパーメガレイドデイ", sfxMega: "メガレイドデイ", sfxRaidHour: "レイドアワー", sfxRaidDay: "レイドデイ",
  pfx: { mega: "メガ ", shadow: "シャドウ ", alola: "アローラ ", galar: "ガラル ", hisui: "ヒスイ ", paldea: "パルデア " },
  weekdays: ["日", "月", "火", "水", "木", "金", "土"],
  months: ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
  navMonth: "{y}年 {m}月",
  legendMain: "🖼️ 日付の絵 = 5★伝説", legendMega: "🔷 メガ", legendShadow: "🌑 シャドウ", legendDay: "🎉 レイドデイ", legendHour: "⏰ レイドアワー",
  selDateTitle: "{m}月{d}日 ({w}) レイド",
  noSpecial: "この日は特別なレイド日程がありません。", bossTapHint: "ボスを押すと100% CP・弱点アタッカーを確認できます。",
  upcomingSpecialH: "🎉 今後のレイドアワー・デイ", upcomingDateFmt: "{m}/{d}({w})",
  guideHour: "特定曜日の夕方(通常18〜19時、現地時間)の1時間、ほぼ全ジムに対象ボスが一斉出現します。短時間で複数討伐でき、伝説厳選・色違い狙いに最適です。",
  guideDay: "通常は週末の3時間、特定ボスが集中出現。無料レイドパスが追加配布され、色違い確率が大幅にアップします。",
  guideSuperMega: "メガレイドに集中する特別デイ。無料パス+メガエナジー大量獲得+色違い確率アップの特典があります。メガ進化の準備・メガエナジー厳選の好機です。",
  guideNote: "※ 正確なボーナス・時間はイベントごとに異なります。公式のお知らせをご確認ください。",
  monthBossesH: "📋 {m}月 登場ボス", cpTableArrow: "CP表 →",
  rotationH: "🔥 ボスローテーション期間", live: "開催中", upcoming: "予定", liveNowH: "🔥 今開催中のレイド", endsWord: "終了",
  saveBtn: "📅 {m}月 カレンダー画像を保存・共有", building: "画像生成中…",
  share: "📤 共有", save: "💾 保存", close: "閉じる",
  imgTitle: "ポケモンGO {m}月 レイド", imgFooter: "ポケモンGO レイド日程", imgShareTitle: "ポケモンGO {m}月 レイド日程", imgFile: "gbl-raid-{m}.png",
  cpModalSub: "個体値別 捕獲CP", cpModalNoData: "このボスのCPデータはまだ準備できていません。",
  metaTitle: "ポケモンGO レイドスケジュール カレンダー · 5★・メガローテーション | GBL Note",
  metaDesc: "ポケモンGOのレイド日程をカレンダーで。5★伝説・メガ・シャドウレイドのローテーション期間とレイドアワー・レイドデイを日付ごとに確認。ボスの100% CP・弱点アタッカーへ連携。自動更新。",
  metaKeywords: ["ポケモンGO レイド日程", "レイドカレンダー", "5★レイド ローテーション", "メガレイド 日程", "レイドアワー", "レイドデイ"],
  ogTitle: "ポケモンGO レイドスケジュール カレンダー", ogDesc: "5★・メガローテーション + レイドアワー・デイ",
};

const S = { ko, en, ja } as const;
export function getSchedule(lang: string): ScheduleDict {
  return (S as Record<string, ScheduleDict>)[lang] || ko;
}
