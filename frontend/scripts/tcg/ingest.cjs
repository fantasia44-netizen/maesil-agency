// Limitless TCG Pocket API → 덱 메타 통계 산출(점유율·승률·Wilson 하한·티어 + 매치업 행렬).
// 통계는 사실(저작권 없음). 원시 standings/pairings를 받아 우리가 직접 집계 → 출처 표기(Limitless).
// 실행: node scripts/tcg/ingest.cjs   (env: TCG_WINDOW_DAYS, TCG_MIN_PLAYERS, TCG_MAX_TOURNEYS)
// 산출: app/[lang]/tcg/data/meta.json, matchups.json  (언어 무관 공유 데이터)
const fs = require("fs");
const path = require("path");
const { localize, localizeDeckName } = require("./localizeName.cjs"); // 카드명·덱명 현지화

const API = "https://play.limitlesstcg.com/api";
// API 매너 — 앱 식별. 공격적 캐시(이 스크립트를 크론으로 시간당 1회) + 폴라이트 딜레이.
const UA = "tcgnote.net meta pipeline (+https://tcgnote.net)";
const WINDOW_DAYS = Number(process.env.TCG_WINDOW_DAYS || 30);
const MIN_PLAYERS = Number(process.env.TCG_MIN_PLAYERS || 16);
const MAX_TOURNEYS = Number(process.env.TCG_MAX_TOURNEYS || 80);
const MIN_DECK_N = Number(process.env.TCG_MIN_DECK_N || 30); // 티어 부여 최소 표본(경기 수)
const OUT_DIR = path.join(__dirname, "..", "..", "app", "[lang]", "tcg", "data");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(p, tries = 0) {
  const res = await fetch(`${API}${p}`, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (res.status === 429 && tries < 5) {
    const ra = Number(res.headers.get("retry-after"));
    const wait = ra > 0 ? ra * 1000 : 1000 * Math.pow(2, tries); // Retry-After 우선, 없으면 지수 백오프
    await sleep(wait);
    return api(p, tries + 1);
  }
  if (!res.ok) throw new Error(`${p} → ${res.status}`);
  return res.json();
}

// Wilson 점수 하한(95%) — 표본 적은 덱의 승률 과대평가 방지(티어 신뢰 보정).
function wilsonLower(wins, n, z = 1.96) {
  if (n <= 0) return 0;
  const p = wins / n;
  const d = 1 + (z * z) / n;
  const c = p + (z * z) / (2 * n);
  const m = z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return (c - m) / d;
}
// 투명한 티어 규칙 — 페이지에 근거로 명시(독창 방법론).
// TCG는 제로섬이라 승률이 ~48~53%로 압축 → 점유율(메타 존재감)을 주도 신호로, Wilson 하한을 성능 바닥으로.
// wilsonLo는 분수(0~1). 50%=0.50가 승패 균형선.
function tierOf(sharePct, wilsonLo, n) {
  if (n < MIN_DECK_N) return "?";
  if (sharePct >= 5 && wilsonLo >= 0.48) return "S";
  if (sharePct >= 2.5 && wilsonLo >= 0.47) return "A";
  if (sharePct >= 1 && wilsonLo >= 0.46) return "B";
  if (sharePct >= 0.5) return "C";
  return "D";
}

async function main() {
  console.log(`[tcg-ingest] window=${WINDOW_DAYS}d minPlayers=${MIN_PLAYERS} maxTourneys=${MAX_TOURNEYS}`);
  const list = await api(`/tournaments?game=pocket&limit=200`);
  const cutoff = Date.now() - WINDOW_DAYS * 86400000;
  const chosen = list
    .filter((t) => t.format !== "CUSTOM") // 비정규(커스텀 포맷) 제외 → 현재 스탠다드 메타만
    .filter((t) => new Date(t.date).getTime() >= cutoff)
    .filter((t) => (t.players || 0) >= MIN_PLAYERS)
    .slice(0, MAX_TOURNEYS);
  console.log(`[tcg-ingest] tournaments selected: ${chosen.length}`);

  const deckAgg = {}; // id -> {id,name,icons,count,wins,losses,ties}
  const matchup = {}; // aId -> bId -> {w,l}
  const bestList = {}; // id -> {score,wins,losses,player,decklist} — 최고 성적 플레이어의 덱리스트(대표 리스트)
  let players = 0, matches = 0, usedTourneys = 0;

  for (const t of chosen) {
    let standings, pairings;
    try {
      standings = await api(`/tournaments/${t.id}/standings`); await sleep(350);
      pairings = await api(`/tournaments/${t.id}/pairings`); await sleep(350);
    } catch (e) { console.warn(`  skip ${t.id}: ${e.message}`); continue; }
    usedTourneys++;
    const ageDays = (Date.now() - new Date(t.date).getTime()) / 86400000; // 이 대회의 경과일(3/7/30 윈도우 분류)

    const pdeck = {}; // username -> deckId
    for (const s of standings) {
      const d = s.deck;
      if (!d || !d.id) continue;
      pdeck[s.player] = d.id;
      const a = deckAgg[d.id] || (deckAgg[d.id] = { id: d.id, name: d.name, icons: d.icons || [], count: 0, wins: 0, losses: 0, ties: 0, w3: 0, l3: 0, w7: 0, l7: 0 });
      const rw = s.record?.wins || 0, rl = s.record?.losses || 0;
      a.count++;
      a.wins += rw; a.losses += rl; a.ties += s.record?.ties || 0;
      if (ageDays <= 7) { a.w7 += rw; a.l7 += rl; }   // 최근 7일 창
      if (ageDays <= 3) { a.w3 += rw; a.l3 += rl; }   // 최근 3일 창
      players++;
      // 대표 덱리스트 — 최고 성적(승 가중) 플레이어 것 보관
      if (s.decklist) {
        const score = (s.record?.wins || 0) * 3 - (s.record?.losses || 0);
        const cur = bestList[d.id];
        if (!cur || score > cur.score) bestList[d.id] = { score, wins: s.record?.wins || 0, losses: s.record?.losses || 0, player: s.player, decklist: s.decklist };
      }
    }
    for (const p of pairings) {
      if (!p.player2 || p.winner === -1) continue; // 부전승/더블로스 제외
      const da = pdeck[p.player1], db = pdeck[p.player2];
      if (!da || !db || da === db) continue;
      matches++;
      if (p.winner === 0) continue; // 무승부는 매치업 W/L 미집계
      const winDeck = p.winner === p.player1 ? da : db;
      const loseDeck = winDeck === da ? db : da;
      ((matchup[winDeck] ||= {})[loseDeck] ||= { w: 0, l: 0 }).w++;
      ((matchup[loseDeck] ||= {})[winDeck] ||= { w: 0, l: 0 }).l++;
    }
  }

  const MIN_TREND = 20; // 추세 표시 최소 표본(경기 수) — 소표본 노이즈 방지(Wilson 철학)
  const wrp = (w, l) => (w + l ? +((w / (w + l)) * 100).toFixed(1) : null);
  const decks = Object.values(deckAgg).map((d) => {
    const n = d.wins + d.losses;
    const winrate = n ? d.wins / n : 0;
    const share = players ? d.count / players : 0;
    const wl = wilsonLower(d.wins, n);
    const wr30 = +(winrate * 100).toFixed(1);
    // 기간별 승률(관측) + 추세: 표본 충분한 최근 창(7일 우선, 없으면 3일) vs 30일 평균의 %p 차.
    const n3 = d.w3 + d.l3, n7 = d.w7 + d.l7;
    const wr3 = wrp(d.w3, d.l3), wr7 = wrp(d.w7, d.l7);
    let trend = null;
    if (n7 >= MIN_TREND && wr7 != null) trend = { d: +(wr7 - wr30).toFixed(1), w: 7 };
    else if (n3 >= MIN_TREND && wr3 != null) trend = { d: +(wr3 - wr30).toFixed(1), w: 3 };
    return {
      id: d.id, name: d.name, nm: localizeDeckName(d.name), icons: d.icons,
      count: d.count, share: +(share * 100).toFixed(2),
      wins: d.wins, losses: d.losses, ties: d.ties, n,
      winrate: wr30, wilsonLo: +(wl * 100).toFixed(1),
      wr3, n3, wr7, n7, trend, // 기간별 승률(관측·표본 포함)
      tier: tierOf(share * 100, wl, n),
    };
  }).sort((a, b) => b.share - a.share);

  const meta = {
    generatedAt: new Date().toISOString(),
    source: "Limitless TCG (play.limitlesstcg.com) — 대회 standings/pairings 자체 집계",
    windowDays: WINDOW_DAYS, minPlayers: MIN_PLAYERS,
    sampleTournaments: usedTourneys, samplePlayers: players, sampleMatches: matches,
    decks,
  };

  // 매치업 — 랭크덱(S~C) 사이만 저장(용량 절약) — 대표덱 페이지용
  const RANKED = ["S", "A", "B", "C"];
  const topIds = new Set(decks.filter((d) => RANKED.includes(d.tier)).map((d) => d.id));
  const matchupsTop = {};
  for (const a of topIds) {
    matchupsTop[a] = {};
    for (const b of topIds) if (a !== b && matchup[a]?.[b]) matchupsTop[a][b] = matchup[a][b];
  }

  // 덱리스트 카드명 현지화(포켓몬만; 트레이너는 영어 유지) — 각 카드에 nm 추가.
  const locList = (arr) => (arr || []).map((c) => { const nm = localize(c.name); return nm ? { ...c, nm } : c; });
  const locDecklist = (dl) => (dl ? { pokemon: locList(dl.pokemon), trainer: locList(dl.trainer), energy: dl.energy || [] } : null);

  // 대표덱 상세 — 랭크덱별 대표 덱리스트 + 통계(대표덱 페이지 /tcg/decks/[id])
  const deckDetails = decks.filter((d) => RANKED.includes(d.tier)).map((d) => ({
    id: d.id, name: d.name, nm: d.nm, icons: d.icons, tier: d.tier, share: d.share, winrate: d.winrate, wilsonLo: d.wilsonLo, n: d.n,
    wr3: d.wr3, n3: d.n3, wr7: d.wr7, n7: d.n7, trend: d.trend, // 기간별 승률(3/7/30일)
    decklist: locDecklist(bestList[d.id]?.decklist),
    sampleFrom: bestList[d.id] ? { wins: bestList[d.id].wins, losses: bestList[d.id].losses } : null,
  }));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 1));
  fs.writeFileSync(path.join(OUT_DIR, "matchups.json"), JSON.stringify(matchupsTop));
  fs.writeFileSync(path.join(OUT_DIR, "decks.json"), JSON.stringify(deckDetails));

  // 스냅샷 history — 매 실행마다 그날의 상위덱 점유율·승률 적재(향후 '오늘 vs N일전' 추세용).
  // 표시는 데이터가 쌓인 뒤. 지금은 저장만 시작(= 최고 레버리지). 같은 날 재실행=마지막 유지, 최근 180일.
  const HIST = path.join(OUT_DIR, "history.json");
  let hist = [];
  try { hist = JSON.parse(fs.readFileSync(HIST, "utf8")); } catch { /* 최초 실행 */ }
  const day = new Date().toISOString().slice(0, 10);
  hist = hist.filter((h) => h.at !== day);
  hist.push({ at: day, decks: decks.slice(0, 50).map((d) => ({ id: d.id, share: d.share, wr: d.winrate, n: d.n })) });
  hist = hist.slice(-180);
  fs.writeFileSync(HIST, JSON.stringify(hist));

  console.log(`[tcg-ingest] done: ${decks.length} decks | ${usedTourneys} tourneys, ${players} players, ${matches} matches | history ${hist.length}d`);
  console.log(`[tcg-ingest] top: ` + decks.slice(0, 8).map((d) => `${d.name}(${d.tier} ${d.share}%/${d.winrate}%·N${d.n})`).join(", "));
}
main().catch((e) => { console.error(e); process.exit(1); });
