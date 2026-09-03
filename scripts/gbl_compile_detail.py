#!/usr/bin/env python3
"""
GBL 티어/상세 데이터 재생성 스크립트.

PvPoke(오픈데이터)의 리그별 랭킹에서 티어·추천 기술배치·카운터·종족값을 뽑아
frontend/app/gbl/gbl_detail.json 을 생성한다. 한글명은 기존 gbl_data.json에서 매핑.

시즌/밸런스 패치로 메타가 바뀌면 이 스크립트를 재실행 후 재배포:
    python scripts/gbl_compile_detail.py

데이터 출처(합법): PvPoke는 오픈소스 게임데이터. 9db 등 상업 사이트 콘텐츠는 사용 안 함.
"""
import json
import math
import os
import sys
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GBL = os.path.join(REPO, "frontend", "app", "[lang]", "gbl")

# 시즌 인자: 없음=현재 시즌(master), "s28"=다음 시즌(twilight-trails 브랜치, 사전 스테이징).
#   python scripts/gbl_compile_detail.py         → gbl_detail.json (현재)
#   python scripts/gbl_compile_detail.py s28      → gbl_detail_s28.json (다음 시즌 미리보기)
# 새 시즌 발표 시 SEASON_BRANCH에 slug→브랜치 한 줄만 추가.
SEASON = sys.argv[1] if len(sys.argv) > 1 else ""
SEASON_BRANCH = {"": "master", "s28": "twilight-trails"}
BRANCH = SEASON_BRANCH.get(SEASON, "master")
SUFFIX = f"_{SEASON}" if SEASON else ""

RANK_BASE = f"https://raw.githubusercontent.com/pvpoke/pvpoke/{BRANCH}/src/data/rankings"
# 메가 랭킹은 시즌 브랜치(twilight-trails)에서 2500/10000이 미산출(score=null 스텁)이라
# 산출 완료된 master 브랜치에서 받는다. 메가 로스터는 브랜치 간 안정적.
MEGA_RANK_BASE = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings"
GAMEMASTER = f"https://raw.githubusercontent.com/pvpoke/pvpoke/{BRANCH}/src/data/gamemaster.json"
# PokeMiners 다국어 i18n (pokemon_name_XXXX / move_name_XXXX 병렬 키 구조)
I18N = {
    "ko": "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_korean.json",
    "en": "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_english.json",
    "ja": "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_japanese.json",
}
# 리그키 → (PvPoke 포맷, CP별 랭킹파일). all=일반, mega=메가 허용 메타.
BASE_SOURCES = {"great": ("all", "rankings-1500.json"), "ultra": ("all", "rankings-2500.json"), "master": ("all", "rankings-10000.json")}
MEGA_SOURCES = {"great_mega": ("mega", "rankings-1500.json"), "ultra_mega": ("mega", "rankings-2500.json"), "master_mega": ("mega", "rankings-10000.json")}
# 메가 리그는 s28+ 시즌 스냅샷에만 포함(현재 s27 base엔 게임 내 메가 리그가 없음).
SOURCES = dict(BASE_SOURCES)
if SEASON:
    SOURCES.update(MEGA_SOURCES)
TOP_N = 200  # 리그별 상위 N종(CMP·조회 커버리지: 썬더·성원숭 등 100~200위권 포함)


def move_mechanics() -> dict:
    """moveId → {gain: 에너지획득, energy: 차지비용, turns: 턴수}."""
    gm = fetch(GAMEMASTER)
    return {m["moveId"]: {"gain": m.get("energyGain", 0), "energy": m.get("energy", 0), "turns": m.get("turns", 1)}
            for m in gm.get("moves", [])}


def taus_seq(cost: int, gain: int, n: int = 5) -> list:
    """연속 발동 시 타수 시퀀스(에너지 이월 반영). 예: 7,6,7,6,7.
    첫 발동은 0에너지에서, 이후엔 남은 에너지에서 시작해 필요한 빠른기술 수를 계산."""
    if not gain or not cost:
        return []
    energy, seq = 0, []
    for _ in range(n):
        need = cost - energy
        t = math.ceil(need / gain) if need > 0 else 0
        energy += t * gain - cost   # 발동 후 남는 에너지 이월
        seq.append(t)
    return seq


def moveset_detail(moveset: list, MV: dict, poke: dict | None = None) -> dict | None:
    """추천 기술배치 → 빠른기술(획득·턴) + 차지별 연속 타수 시퀀스.
    poke(게임마스터 엔트리) 주면 전체 학습기술풀(fasts/chargedAll)도 추가 —
    상세페이지에서 노멀기 선택·차지 여러개 표시용(타수는 클라에서 선택기술 기준 재계산)."""
    if not moveset:
        return None
    f = MV.get(moveset[0], {})
    gain = f.get("gain", 0)
    charged = []
    for cid in moveset[1:]:
        c = MV.get(cid, {})
        charged.append({"id": cid, "energy": c.get("energy", 0), "counts": taus_seq(c.get("energy", 0), gain)})
    out = {"fast": {"id": moveset[0], "gain": gain, "turns": f.get("turns", 1)}, "charged": charged}
    if poke:
        rec_charged = [c["id"] for c in charged]
        fast_ids = [moveset[0]] + [x for x in poke.get("fastMoves", []) if x != moveset[0]]
        out["fasts"] = [{"id": fid, "gain": MV.get(fid, {}).get("gain", 0), "turns": MV.get(fid, {}).get("turns", 1)}
                        for fid in fast_ids if fid in MV]
        seen, chargedAll = set(), []
        for cid in rec_charged + [x for x in poke.get("chargedMoves", []) if x not in rec_charged]:
            if cid in seen or cid == "FRUSTRATION":
                continue
            seen.add(cid)
            e = MV.get(cid, {}).get("energy", 0)
            if e > 0:
                chargedAll.append({"id": cid, "energy": e})
        out["chargedAll"] = chargedAll
    return out


def fetch(url: str) -> list:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (gbl-note compile)"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def tier_of(score: float, mx: float) -> str:
    """리그 최고점 기준 상대 티어(리그마다 점수 폭이 달라서)."""
    d = mx - score
    if d <= 2.5: return "S"
    if d <= 6: return "A"
    if d <= 10: return "B"
    if d <= 15: return "C"
    return "D"


# 언어별 폼 접두/접미 표기. "ko"는 기존 disp_ko와 바이트 동일(하위호환), "en"/"ja"는 대응 표기.
_AFFIX = {
    "ko": {"reg": {"_alolan": "알로라 ", "_galarian": "가라르 ", "_hisuian": "히스이 ", "_paldean": "팔데아 "},
           "mega": "메가 ", "megaX": " X", "megaY": " Y", "primal": "원시 ",
           "white": "화이트 ", "black": "블랙 ", "shadow": "그림자 ",
           "origin": " (오리진)", "therian": " (영물폼)",
           "crowned_sword": " (검왕)", "crowned_shield": " (방패왕)", "dusk_mane": " (황혼의 갈기)", "dawn_wings": " (새벽의 날개)", "hero": " (역전의 용사)"},
    "en": {"reg": {"_alolan": "Alolan ", "_galarian": "Galarian ", "_hisuian": "Hisuian ", "_paldean": "Paldean "},
           "mega": "Mega ", "megaX": " X", "megaY": " Y", "primal": "Primal ",
           "white": "White ", "black": "Black ", "shadow": "Shadow ",
           "origin": " (Origin)", "therian": " (Therian)",
           "crowned_sword": " (Crowned Sword)", "crowned_shield": " (Crowned Shield)", "dusk_mane": " (Dusk Mane)", "dawn_wings": " (Dawn Wings)", "hero": " (Hero)"},
    "ja": {"reg": {"_alolan": "アローラ", "_galarian": "ガラル", "_hisuian": "ヒスイ", "_paldean": "パルデア"},
           "mega": "メガ", "megaX": "X", "megaY": "Y", "primal": "ゲンシ",
           "white": "ホワイト", "black": "ブラック", "shadow": "シャドウ",
           "origin": "（オリジンフォルム）", "therian": "（れいじゅうフォルム）",
           "crowned_sword": " (けんのおう)", "crowned_shield": " (たてのおう)", "dusk_mane": " (たそがれのたてがみ)", "dawn_wings": " (あかつきのつばさ)", "hero": " (れきせんのゆうしゃ)"},
}


def i18n_map(url: str) -> dict:
    """PokeMiners i18n(교차배열) → {key: value}."""
    raw = fetch(url)
    arr = raw.get("data") if isinstance(raw, dict) else raw
    return {arr[i]: arr[i + 1] for i in range(0, len(arr) - 1, 2)}


def _dex_name(names: dict, dex) -> str | None:
    """i18n 맵에서 dex 표시명(패딩/무패딩 키 모두 시도)."""
    if dex is None:
        return None
    return names.get(f"pokemon_name_{int(dex):04d}") or names.get(f"pokemon_name_{int(dex)}")


def _disp(sid: str, base: str | None, aff: dict) -> str | None:
    """base 표시명 + 폼 접두/접미. base 없으면 None."""
    if not base:
        return None
    reg = next((v for suf, v in aff["reg"].items() if suf in sid), "")
    if "_mega_x" in sid: name = aff["mega"] + base + aff["megaX"]
    elif "_mega_y" in sid: name = aff["mega"] + base + aff["megaY"]
    elif "_mega" in sid: name = aff["mega"] + reg + base
    elif "_primal" in sid: name = aff["primal"] + base
    elif "_white" in sid: name = aff["white"] + base
    elif "_black" in sid: name = aff["black"] + base
    else: name = reg + base
    if "_origin" in sid: name += aff["origin"]
    elif "_therian" in sid: name += aff["therian"]
    elif "_crowned_sword" in sid: name += aff["crowned_sword"]
    elif "_crowned_shield" in sid: name += aff["crowned_shield"]
    elif "_dusk_mane" in sid: name += aff["dusk_mane"]
    elif "_dawn_wings" in sid: name += aff["dawn_wings"]
    elif "_hero" in sid: name += aff["hero"]
    if "_shadow" in sid or sid.endswith("_shadow"): name = aff["shadow"] + name
    return name


def disp_names(sid: str, sp: dict, pdko: dict, names: dict) -> tuple:
    """speciesId → (ko, en, ja, dex, types[]). 언어별 base를 각 소스에서 조회.
    ko는 하위호환 위해 기존과 동일하게 pokedex_ko.json만 사용(바이트 동일 보장)."""
    p = sp.get(sid, {})
    dex = p.get("dex")
    base_ko = pdko.get(str(dex)) if dex is not None else None
    base_en = _dex_name(names["en"], dex)
    base_ja = _dex_name(names["ja"], dex)
    types = [t for t in (p.get("types") or []) if t and t != "none"]
    return (_disp(sid, base_ko, _AFFIX["ko"]),
            _disp(sid, base_en, _AFFIX["en"]),
            _disp(sid, base_ja, _AFFIX["ja"]),
            dex, types)


def main() -> None:
    data = json.load(open(os.path.join(GBL, "gbl_data.json"), encoding="utf-8"))
    ko = {m["id"]: m["ko"] for lg in data["leagues"].values() for m in lg["pokemon"]}
    MV = move_mechanics()
    sp = {p["speciesId"]: p for p in fetch(GAMEMASTER)["pokemon"]}  # 한글명·dex·타입 소스
    pdko = json.load(open(os.path.join(GBL, "pokedex_ko.json"), encoding="utf-8"))
    names = {lang: i18n_map(url) for lang, url in I18N.items()}  # ko/en/ja 다국어 i18n
    print(f"i18n keys: ko={len(names['ko'])} en={len(names['en'])} ja={len(names['ja'])}")

    out = {}
    for league, (fmt, fn) in SOURCES.items():
        try:
            base = MEGA_RANK_BASE if fmt == "mega" else RANK_BASE
            raw = fetch(f"{base}/{fmt}/overall/{fn}")
        except Exception as e:
            print(f"[skip] {league} ({fmt}/{fn}): {e}")
            continue
        # score가 null인 엔트리(메가 일부 랭킹에 존재) 방어 — .get은 키가 있으면 default 대신 null 반환.
        ranks = [r for r in raw if (r.get("score") or 0) > 0][:TOP_N]
        if not ranks:
            print(f"[skip] {league}: 랭킹 0종")
            continue
        mx = max((r.get("score") or 0) for r in ranks)
        mons = []
        for r in ranks:
            dko, den, dja, ddex, dtypes = disp_names(r["speciesId"], sp, pdko, names)
            mons.append({
                "id": r["speciesId"],
                "ko": dko, "en": den, "ja": dja, "dex": ddex, "types": dtypes,  # 자체 내장(gbl_data 미커버 대비)
                "score": round(r.get("score") or 0),
                "tier": tier_of(r.get("score") or 0, mx),
                "moveset": r.get("moveset", []),
                "mv": moveset_detail(r.get("moveset", []), MV, sp.get(r["speciesId"])),  # 빠른기술 획득·턴 + 차지별 타수 + 전체 기술풀
                # 매치업 레이팅(500=대등, >500 우세, <500 열세)
                "counters": [{"id": c["opponent"], "r": c["rating"]} for c in (r.get("counters") or [])[:5]],
                "wins": [{"id": c["opponent"], "r": c["rating"]} for c in (r.get("matchups") or [])[:5]],
                # 역할 점수 [선봉, 마무리, 교체, 차지, 공격, 일관성] (PvPoke scores 순서)
                "scores": [round(x, 1) for x in (r.get("scores") or [])],
                # atk는 CMP 우선권 판정용이라 소수1자리 유지(정수 반올림 시 동점 왜곡)
                "stats": {k: (round(v, 1) if k == "atk" else round(v))
                          for k, v in (r.get("stats") or {}).items()
                          if k in ("atk", "def", "hp", "product")},
            })
        # 섀도우는 종족값(및 CMP 공격 스탯)이 일반폼과 동일해야 함(섀도우 배수는 데미지에만 적용).
        # PvPoke가 IV 최적화를 따로 해 미세차가 생기므로 base 폼 스탯으로 통일.
        by_id = {m["id"]: m for m in mons}
        for m in mons:
            if m["id"].endswith("_shadow"):
                base = by_id.get(m["id"][:-7])
                if base and base.get("stats"):
                    m["stats"] = dict(base["stats"])
        out[league] = mons
        from collections import Counter
        print(f"{league}: {len(mons)}종  tier분포={dict(Counter(m['tier'] for m in mons))}")

    missing = {sid for lg in out.values() for m in lg
               for sid in [c["id"] for c in m["counters"]] + [c["id"] for c in m["wins"]] + [m["id"]]
               if sid not in ko}
    if missing:
        print(f"[warn] 한글명 없는 speciesId {len(missing)}개(영문 폴백): {list(missing)[:8]}")
    else:
        print("한글명 매핑 100% (누락 0)")

    dest = os.path.join(GBL, f"gbl_detail{SUFFIX}.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"saved {dest} ({os.path.getsize(dest)} bytes)  [branch={BRANCH}]")

    # 포켓몬 이름은 시즌 불변 → 시즌 스냅샷(SUFFIX)에서는 pokedex_names.json 재생성 생략.
    if SUFFIX:
        return

    # 다국어 dex→이름 맵 (신규 파일, pokedex_ko.json은 하위호환 위해 그대로 유지)
    pdnames, miss_en, miss_ja = {}, [], []
    for k in pdko:
        dex = int(k)
        en = _dex_name(names["en"], dex)
        ja = _dex_name(names["ja"], dex)
        if not en: miss_en.append(k)
        if not ja: miss_ja.append(k)
        pdnames[k] = {"ko": pdko[k], "en": en, "ja": ja}
    ndest = os.path.join(GBL, "pokedex_names.json")
    json.dump(pdnames, open(ndest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"saved {ndest} ({len(pdnames)} dex, {os.path.getsize(ndest)} bytes)")
    if miss_en: print(f"[warn] EN 이름 없는 dex {len(miss_en)}개: {miss_en[:12]}")
    if miss_ja: print(f"[warn] JA 이름 없는 dex {len(miss_ja)}개: {miss_ja[:12]}")


if __name__ == "__main__":
    main()
