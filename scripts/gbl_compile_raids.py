#!/usr/bin/env python3
"""
레이드(PvE) 속성별 어택커 티어표 데이터 생성.

데이터 소스(모두 오픈데이터):
  - 포켓몬·기술배정·종족값·폼(메가/원시/오리진/섀도우/레거시): PvPoke gamemaster
    (매 시즌/패치 갱신 → 최신 콘텐츠·레거시기술 반영. 예: 메가뮤츠X/Y, 화룡정점, 시간의포효)
  - PvE 기술 수치(위력·시전시간·에너지): PokeMiners 게임마스터 무브 템플릿(수치는 안정적)
  - 한글 포켓몬명/기술명: PokeMiners 한글 i18n

※ PvP(배틀리그)와 완전 별개. 이건 일반 레이드 화력 순위다.

방법론(공개):
  - PvE 데미지 = floor(0.5 × 위력 × 공격/방어 × STAB) + 1
  - 공격 = (종족공격+15) × CPM(L40) × (섀도우 1.2)
  - 대상: 중립 방어 180 고정, 상성 1.0 (같은 속성 내 순위 비교용)
  - STAB 1.2(기술 타입이 포켓몬 타입과 일치 시)
  - DPS = 사이클(빠른기술×n + 차지1회) 총뎀 / 총시간, n=ceil(차지비용/빠른획득)
  - 내구지수 = 유효체력 × 유효방어 / 100 (섀도우 방어 0.8333)
  - 속성 분류: 차지기술 타입 기준. 각 포켓몬은 그 속성 최고 DPS 조합으로 1회 등재.
  - 레거시(전용/이벤트 한정) 기술 사용 조합은 * 표시.

재실행:  python scripts/gbl_compile_raids.py
"""
import json
import math
import os
import re
import urllib.request
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GBL = os.path.join(REPO, "frontend", "app", "gbl")

PVPOKE_GM = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json"
PVE_GM = "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json"
KO_URL = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_korean.json"

CPM40 = 0.7903001
TARGET_DEF = 180.0
SHADOW_ATK = 1.2
SHADOW_DEF = 0.8333333
TOP_PER_TYPE = 30
# TDO(총 딜량) 모델: 버티는시간 = 체력×방어/BOSS_K (가상 5성 보스 피격 가정). TDO = DPS × 버티는시간.
BOSS_K = 950.0

# PvPoke released=False 지만 출시 예정으로 포함할 폼(사용자 승인). "출시예정" 배지 표시.
# 칼로스 스타터 메가 3종 — 2026-10 출시예정
INCLUDE_UPCOMING = {"greninja_mega", "delphox_mega", "chesnaught_mega"}

# 전설 전용/시그니처 기술 — PvPoke eliteMoves에 없어도 * 레거시(특수기) 마킹. 참고사이트 관례와 일치.
EXTRA_LEGACY = {
    "ICE_BURN", "FREEZE_SHOCK",            # 화이트/블랙 큐레무
    "ORIGIN_PULSE", "PRECIPICE_BLADES",    # 원시 가이오가/그란돈
    "ROAR_OF_TIME", "SPACIAL_REND",        # 오리진 디아루가/펄기아
    "SUNSTEEL_STRIKE", "MOONGEIST_BEAM",   # 네크로즈마 황혼/새벽
    "AEROBLAST", "SACRED_FIRE",            # 루기아 / 칠색조
    "FUSION_FLARE", "FUSION_BOLT",         # 레시라무/제크로무(크로스플레임/썬더)
    "GLAIVE_RUSH",                          # 드닐레이브(드래곤)
    "BEHEMOTH_BLADE", "BEHEMOTH_BASH",     # 자시안(거수참)/자마젠타(거수탄)
}

TYPES = ["normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison",
         "ground", "flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy"]
TYPE_KO = {"normal": "노말", "fire": "불꽃", "water": "물", "electric": "전기", "grass": "풀",
           "ice": "얼음", "fighting": "격투", "poison": "독", "ground": "땅", "flying": "비행",
           "psychic": "에스퍼", "bug": "벌레", "rock": "바위", "ghost": "고스트", "dragon": "드래곤",
           "dark": "악", "steel": "강철", "fairy": "페어리"}


def fetch(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (gbl-note compile)"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.load(r)


def ptype(s: str) -> str:
    return (s or "").replace("POKEMON_TYPE_", "").lower()


def pretty(mid: str) -> str:
    return " ".join(w.capitalize() for w in re.sub(r"_FAST$", "", mid or "").split("_"))


def load_pve_moves(gm: list, ko: dict) -> dict:
    """PokeMiners 무브 템플릿 → movementId → {type,power,dur,energy,ko}. (PvE 수치)"""
    out = {}
    for t in gm:
        ms = t.get("data", {}).get("moveSettings")
        if not ms:
            continue
        mid = ms.get("movementId")
        if not mid:
            continue
        m = re.match(r"V(\d+)_MOVE_", t.get("templateId", ""))
        num = m.group(1) if m else None
        ko_name = ko.get(f"move_name_{num}") if num else None
        out[mid] = {
            "type": ptype(ms.get("pokemonType")),
            "power": float(ms.get("power") or 0),
            "dur": float(ms.get("durationMs") or 0) / 1000.0,
            "energy": float(ms.get("energyDelta") or 0),
            "ko": ko_name or pretty(mid),
        }
    return out


# PvPoke ↔ PokeMiners 기술 ID 표기차 별칭
MOVE_ALIAS = {
    "FUTURE_SIGHT": "FUTURESIGHT",
    "PYRO_BALL": "PYROBALL",
    "TECHNO_BLAST_DOUSE": "TECHNO_BLAST_WATER",
}


def pve(mid: str, MV: dict, is_fast: bool):
    aid = MOVE_ALIAS.get(mid, mid)
    if is_fast:
        return MV.get(aid + "_FAST") or MV.get(aid)
    return MV.get(aid)


def dmg(power: float, atk: float, stab: float, eff: float = 1.0) -> int:
    return math.floor(0.5 * power * (atk / TARGET_DEF) * stab * eff) + 1


REG = [("_alolan", "알로라 "), ("_galarian", "가라르 "), ("_hisuian", "히스이 "), ("_paldean", "팔데아 ")]


def form_label(sid: str, dex: int, ko: dict, shadow: bool):
    """speciesId + dex → (한글명, mega코드'', 'X','Y','M', primal불린)."""
    base = ko.get(f"pokemon_name_{dex:04d}") or ko.get(f"pokemon_name_{dex}") or f"#{dex}"
    region = next((k for suf, k in REG if suf in sid), "")
    mega, primal = "", False
    if "_primal" in sid:
        primal = True
        name = "원시 " + base
    elif "_mega_x" in sid:
        mega = "X"; name = "메가 " + base + " X"
    elif "_mega_y" in sid:
        mega = "Y"; name = "메가 " + base + " Y"
    elif "_mega" in sid:
        mega = "M"; name = "메가 " + region + base
    elif "_black" in sid:
        name = "블랙 " + base       # 블랙큐레무
    elif "_white" in sid:
        name = "화이트 " + base     # 화이트큐레무
    else:
        name = region + base
    # 폼 접미 (다형태 전설/폼 구분 — 안 하면 dedup에 뭉쳐 사라짐)
    if "_origin" in sid:
        name += " (오리진)"
    elif "_therian" in sid:
        name += " (영물폼)"
    elif "_dusk_mane" in sid:
        name += " (황혼의갈기)"
    elif "_dawn_wings" in sid:
        name += " (새벽의날개)"
    elif "_ultra" in sid:
        name += " (울트라)"
    elif "_shadow_rider" in sid:
        name += " (흑마)"           # 버드렉스 흑마
    elif "_ice_rider" in sid or sid.endswith("_ice"):
        name += " (백마)"           # 버드렉스 백마
    elif "_single_strike" in sid:
        name += " (일격)"           # 우라오스 일격
    elif "_rapid_strike" in sid:
        name += " (연격)"           # 우라오스 연격
    elif "_crowned" in sid:
        name += " (방패왕)" if "zamazenta" in sid else " (검왕)"   # 자마젠타/자시안
    if shadow:
        name = "섀도우 " + name
    return name, mega, primal


def main():
    print("fetching PvPoke gamemaster…")
    pvp = fetch(PVPOKE_GM)["pokemon"]
    print("fetching PokeMiners GM (PvE move stats)…")
    gm = fetch(PVE_GM)
    print("fetching korean i18n…")
    ko_raw = fetch(KO_URL)
    arr = ko_raw.get("data") if isinstance(ko_raw, dict) else ko_raw
    ko = {arr[i]: arr[i + 1] for i in range(0, len(arr) - 1, 2)}
    MV = load_pve_moves(gm, ko)
    print(f"  pvpoke pokemon={len(pvp)}  pve moves={len(MV)}  ko keys={len(ko)}")

    rows = []
    missing = set()
    for p in pvp:
        bs = p.get("baseStats") or {}
        if not bs.get("atk") or not p.get("dex"):
            continue
        sid = p["speciesId"]
        released = bool(p.get("released"))
        if not (released or sid in INCLUDE_UPCOMING):
            continue  # 미출시/가상 폼 제외 (신뢰도)
        upcoming = not released
        tags = set(p.get("tags") or [])
        dex = int(p["dex"])
        shadow = "shadow" in tags or sid.endswith("_shadow")
        ptypes = {t for t in (p.get("types") or []) if t and t != "none"}
        fasts = p.get("fastMoves") or []
        chargeds = p.get("chargedMoves") or []
        elite = set(p.get("eliteMoves") or [])

        atk = (bs["atk"] + 15) * CPM40 * (SHADOW_ATK if shadow else 1.0)
        deff = (bs["def"] + 15) * CPM40 * (SHADOW_DEF if shadow else 1.0)
        hp = (bs["hp"] + 15) * CPM40
        survive = hp * deff / BOSS_K   # 버티는 시간(초) 지수
        name, mega, primal = form_label(sid, dex, ko, shadow)

        # 속성별 최고 조합
        by_type = {}
        for cid in chargeds:
            c = pve(cid, MV, False)
            if not c:
                missing.add(cid); continue
            if c["energy"] >= 0 or c["dur"] <= 0:
                continue
            bt = c["type"]  # 역할(공격) 속성 = 차지기술 타입. 이 속성 약점 대상 기준으로 계산.
            e_c = -c["energy"]
            c_stab = 1.2 if bt in ptypes else 1.0
            c_dmg = dmg(c["power"], atk, c_stab, 1.6)  # 차지=역할속성 → 약점 1.6
            best = None
            for fid in fasts:
                f = pve(fid, MV, True)
                if not f:
                    missing.add(fid); continue
                if f["energy"] <= 0 or f["dur"] <= 0:
                    continue
                f_stab = 1.2 if f["type"] in ptypes else 1.0
                f_eff = 1.6 if f["type"] == bt else 1.0  # 빠른기술이 역할속성이면 약점 1.6 (전기역할=전기 빠른기술 우대)
                f_dmg = dmg(f["power"], atk, f_stab, f_eff)
                n = math.ceil(e_c / f["energy"])
                dps = (n * f_dmg + c_dmg) / (n * f["dur"] + c["dur"])
                if best is None or dps > best[0]:
                    best = (dps, fid)
            if best is None:
                continue
            legacy = (cid in elite) or (best[1] in elite) or (cid in EXTRA_LEGACY) or (best[1] in EXTRA_LEGACY)
            if bt not in by_type or best[0] > by_type[bt]["dps"]:
                by_type[bt] = {"dps": best[0], "fast": best[1], "charged": cid, "legacy": legacy}

        for bt, v in by_type.items():
            dps = v["dps"]
            tdo = dps * survive                      # 총 딜량 = DPS × 버티는시간
            er = (dps ** 3 * tdo) ** 0.25            # 종합점수(ER): 딜³×총딜량, 포켓배틀러 Overall식
            rows.append({
                "type": bt, "dps": round(dps, 1), "tdo": round(tdo), "er": round(er, 1),
                "name": name, "dex": dex, "shadow": shadow, "mega": mega, "primal": primal,
                "legacy": v["legacy"], "upcoming": upcoming, "fast": v["fast"], "charged": v["charged"],
                "atk": round(atk), "def": round(deff), "hp": round(hp),
            })

    # 속성별 그룹 + DPS정렬 + 이름중복제거 + 상위N + 상대%
    out_types = {}
    for tp in TYPES:
        grp = sorted([r for r in rows if r["type"] == tp], key=lambda r: r["er"], reverse=True)
        uniq, names = [], set()
        for r in grp:
            if r["name"] in names:
                continue
            names.add(r["name"])
            uniq.append(r)
        top = uniq[:TOP_PER_TYPE]
        mx = top[0]["er"] if top else 1
        for r in top:
            r["rel"] = round(r["er"] / mx * 100, 1)  # 종합점수(ER) 기준 상대%
            f = pve(r["fast"], MV, True) or {}
            c = pve(r["charged"], MV, False) or {}
            r["fastKo"] = f.get("ko", pretty(r["fast"]))
            r["chargedKo"] = c.get("ko", pretty(r["charged"]))
            r["fastType"] = f.get("type", "")
            r["chargedType"] = c.get("type", "")
        out_types[tp] = top

    out = {
        "meta": {
            "level": 40, "cpm": CPM40, "targetDef": TARGET_DEF,
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "source": "PvPoke + PokeMiners (오픈데이터)",
            "typeKo": TYPE_KO,
        },
        "types": out_types,
    }
    dest = os.path.join(GBL, "gbl_raids.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"saved {dest} ({os.path.getsize(dest)} bytes)")

    if missing:
        print(f"[warn] PvE 수치 없는 기술 {len(missing)}개(스킵): {sorted(missing)[:10]}")
    for tp in ("water", "fire", "dragon", "electric", "flying", "fighting"):
        print(f"\n[{TYPE_KO[tp]}] 상위 10:")
        for i, r in enumerate(out_types[tp][:10], 1):
            lg = "*" if r["legacy"] else " "
            print(f"  {i:2} {r['name']:18s} DPS {r['dps']:6.2f} ({r['rel']:5.1f}%){lg} {r['fastKo']}+{r['chargedKo']}")


if __name__ == "__main__":
    main()
