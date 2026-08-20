#!/usr/bin/env python3
"""
레이드(PvE) 속성별 어택커 티어표 데이터 생성.

PokeMiners 공식 게임마스터(오픈데이터)에서 실제 종족값 + PvE 기술 수치를 뽑아
속성별 딜러 랭킹(DPS·내구)을 계산 → frontend/app/gbl/gbl_raids.json 생성.

※ PvP(배틀리그)와 완전히 별개. 이건 일반 레이드 화력 순위다.

방법론(공개):
  - PvE 데미지 = floor(0.5 × 위력 × 공격/방어 × STAB × 상성) + 1
  - 공격 = (종족공격+15) × CPM(L40) × (섀도우 1.2)
  - 대상: 중립 방어 180 고정, 상성 1.0 (같은 속성 내 순위 비교용)
  - STAB 1.2(기술 타입이 포켓몬 타입과 일치 시)
  - DPS = 사이클(빠른기술×n + 차지1회) 총뎀 / 총시간, n=ceil(차지비용/빠른획득)
  - 내구지수 = 유효체력 × 유효방어 / 100 (섀도우 방어 0.8333)
  - 속성 분류: 차지기술 타입 기준. 각 포켓몬은 그 속성 최고 DPS 조합으로 1회 등재.

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

GM_URL = "https://raw.githubusercontent.com/PokeMiners/game_masters/master/latest/latest.json"
KO_URL = "https://raw.githubusercontent.com/PokeMiners/pogo_assets/master/Texts/Latest%20APK/JSON/i18n_korean.json"

CPM40 = 0.7903001          # 레벨40 CP 배수(티어 순위는 레벨 무관, 절대 DPS만 스케일)
TARGET_DEF = 180.0          # 중립 대상 방어(고정 → 순위 불변)
SHADOW_ATK = 1.2
SHADOW_DEF = 0.8333333
TOP_PER_TYPE = 30           # 속성별 상위 N (얇은 페이지·잡몹 방지)

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
    """POKEMON_TYPE_FIRE → fire."""
    return (s or "").replace("POKEMON_TYPE_", "").lower()


def pretty(mid: str) -> str:
    """FIRE_SPIN_FAST → Fire Spin (영문 폴백)."""
    s = re.sub(r"_FAST$", "", mid or "")
    return " ".join(w.capitalize() for w in s.split("_"))


def load_moves(gm: list, ko: dict) -> dict:
    """movementId → {type,power,dur,energy,ko}."""
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
            "energy": float(ms.get("energyDelta") or 0),   # fast:+ / charged:-
            "ko": ko_name or pretty(mid),
        }
    return out


def dmg(power: float, atk: float, stab: float) -> int:
    return math.floor(0.5 * power * (atk / TARGET_DEF) * stab) + 1


def best_combo(atk: float, ptypes: set, fasts: list, charged_id: str, MV: dict):
    """주어진 차지기술(charged_id)로 최고 DPS 내는 빠른기술 조합 → (dps, fast_id)."""
    c = MV.get(charged_id)
    if not c or c["energy"] >= 0 or c["dur"] <= 0:
        return None
    e_c = -c["energy"]
    c_stab = 1.2 if c["type"] in ptypes else 1.0
    c_dmg = dmg(c["power"], atk, c_stab)
    best = None
    for fid in fasts:
        f = MV.get(fid)
        if not f or f["energy"] <= 0 or f["dur"] <= 0:
            continue
        f_stab = 1.2 if f["type"] in ptypes else 1.0
        f_dmg = dmg(f["power"], atk, f_stab)
        n = math.ceil(e_c / f["energy"])
        cyc_t = n * f["dur"] + c["dur"]
        cyc_d = n * f_dmg + c_dmg
        dps = cyc_d / cyc_t
        if best is None or dps > best[0]:
            best = (dps, fid)
    return best


def emit_forms(gm: list):
    """게임마스터 → 계산 대상 (baseName, dex, atk_base, def_base, sta_base, types, fasts, chargeds, variant, shadow_ok)."""
    seen = set()  # (pokemonId, formkey) 중복 방지
    for t in gm:
        ps = t.get("data", {}).get("pokemonSettings")
        tid = t.get("templateId", "")
        if not ps or "_POKEMON_" not in tid:
            continue
        if "COPY_" in tid or "_HOME_" in tid or "_FEMALE" in tid and "MEOWSTIC" not in tid:
            continue
        pid = ps.get("pokemonId")
        form = ps.get("form") or ""
        m = re.match(r"V(\d+)_POKEMON_", tid)
        dex = int(m.group(1)) if m else 0
        stats = ps.get("stats") or {}
        if not stats.get("baseAttack"):
            continue
        types = {ptype(ps.get("type")), ptype(ps.get("type2"))} - {""}
        fasts = ps.get("quickMoves") or []
        chargeds = ps.get("cinematicMoves") or []
        shadow_ok = bool(ps.get("shadow"))

        # 폼 분류: 기본 / 지역폼(알로라·가라르·히스이) 만 채택, 코스튬·기본중복은 스킵
        variant = None
        if form in ("", pid, f"{pid}_NORMAL"):
            key = (pid, "base")
            if key in seen:
                continue
            seen.add(key)
            variant = ""
        else:
            reg = next((r for r in ("ALOLA", "GALARIAN", "HISUIAN", "PALDEA") if r in form), None)
            if not reg:
                continue  # 코스튬/기타 폼 제외
            key = (pid, reg)
            if key in seen:
                continue
            seen.add(key)
            variant = reg

        base = {"pid": pid, "dex": dex, "atk": stats["baseAttack"], "def": stats["baseDefense"],
                "sta": stats["baseStamina"], "types": types, "fasts": fasts, "chargeds": chargeds,
                "variant": variant, "shadow_ok": shadow_ok,
                "megas": ps.get("tempEvoOverrides") or []}
        yield base


REG_KO = {"ALOLA": "알로라 ", "GALARIAN": "가라르 ", "HISUIAN": "히스이 ", "PALDEA": "팔데아 "}


def ko_name(ko: dict, dex: int, variant: str, shadow: bool, mega: str) -> str:
    base = ko.get(f"pokemon_name_{dex:04d}") or ko.get(f"pokemon_name_{dex}") or f"#{dex}"
    name = base
    if variant:
        name = REG_KO.get(variant, "") + base
    if mega:
        suffix = " X" if mega == "X" else " Y" if mega == "Y" else ""
        name = f"메가 {base}{suffix}"
    if shadow:
        name = "섀도우 " + name
    return name


def build_entry(atk_base, def_base, sta_base, ptypes, fasts, chargeds, MV, shadow, name, dex, mega_label, variant):
    atk = (atk_base + 15) * CPM40 * (SHADOW_ATK if shadow else 1.0)
    deff = (def_base + 15) * CPM40 * (SHADOW_DEF if shadow else 1.0)
    hp = (sta_base + 15) * CPM40
    # 이 포켓몬이 낼 수 있는 속성별 최고 조합
    by_type = {}
    for cid in chargeds:
        c = MV.get(cid)
        if not c:
            continue
        bt = c["type"]
        combo = best_combo(atk, ptypes, fasts, cid, MV)
        if not combo:
            continue
        dps, fid = combo
        if bt not in by_type or dps > by_type[bt]["dps"]:
            by_type[bt] = {"dps": dps, "fast": fid, "charged": cid}
    bulk = round(hp * deff / 100)
    entries = []
    for bt, v in by_type.items():
        entries.append({
            "type": bt, "dps": round(v["dps"], 2), "bulk": bulk,
            "name": name, "dex": dex, "shadow": shadow, "variant": variant, "mega": mega_label,
            "fast": v["fast"], "charged": v["charged"],
            "atk": round(atk), "def": round(deff), "hp": round(hp),
        })
    return entries


def main():
    print("fetching game master…")
    gm = fetch(GM_URL)
    print("fetching korean i18n…")
    ko_raw = fetch(KO_URL)
    arr = ko_raw.get("data") if isinstance(ko_raw, dict) else ko_raw
    ko = {arr[i]: arr[i + 1] for i in range(0, len(arr) - 1, 2)}
    print(f"  gm templates={len(gm)}  ko keys={len(ko)}")

    MV = load_moves(gm, ko)
    print(f"  moves={len(MV)}")

    rows = []  # 모든 (포켓몬변형, 속성) 엔트리
    missing_move = set()
    for b in emit_forms(gm):
        # 무브 커버리지 체크
        for mid in b["fasts"] + b["chargeds"]:
            if mid not in MV:
                missing_move.add(mid)
        # 1) 일반 폼
        base_name = ko_name(ko, b["dex"], b["variant"], False, "")
        rows += build_entry(b["atk"], b["def"], b["sta"], b["types"], b["fasts"], b["chargeds"],
                            MV, False, base_name, b["dex"], "", b["variant"])
        # 2) 섀도우 (가능한 종만)
        if b["shadow_ok"]:
            sname = ko_name(ko, b["dex"], b["variant"], True, "")
            rows += build_entry(b["atk"], b["def"], b["sta"], b["types"], b["fasts"], b["chargeds"],
                                MV, True, sname, b["dex"], "", b["variant"])
        # 3) 메가 (지역폼 아닌 기본에만)
        if not b["variant"]:
            for me in b["megas"]:
                tev = me.get("tempEvoId", "")
                mcode = "X" if tev.endswith("_X") else "Y" if tev.endswith("_Y") else "M"
                mstats = me.get("stats") or {}
                mtypes = {ptype(me.get("typeOverride1")), ptype(me.get("typeOverride2"))} - {""}
                if not mtypes:
                    mtypes = b["types"]
                mname = ko_name(ko, b["dex"], "", False, mcode)
                rows += build_entry(mstats.get("baseAttack", b["atk"]), mstats.get("baseDefense", b["def"]),
                                    mstats.get("baseStamina", b["sta"]), mtypes, b["fasts"], b["chargeds"],
                                    MV, False, mname, b["dex"], mcode, "")

    # 속성별 그룹 + DPS 정렬 + 상위 N + 상대% (속성 1위 대비)
    out_types = {}
    for tp in TYPES:
        grp = sorted([r for r in rows if r["type"] == tp], key=lambda r: r["dps"], reverse=True)
        # 같은 포켓몬(이름) 중복 제거(최고 조합만)
        uniq, names = [], set()
        for r in grp:
            k = (r["name"],)
            if k in names:
                continue
            names.add(k)
            uniq.append(r)
        top = uniq[:TOP_PER_TYPE]
        mx = top[0]["dps"] if top else 1
        for r in top:
            r["rel"] = round(r["dps"] / mx * 100, 1)
            f, c = MV.get(r["fast"], {}), MV.get(r["charged"], {})
            r["fastKo"], r["chargedKo"] = f.get("ko", pretty(r["fast"])), c.get("ko", pretty(r["charged"]))
        out_types[tp] = top

    out = {
        "meta": {
            "level": 40, "cpm": CPM40, "targetDef": TARGET_DEF,
            "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "typeKo": TYPE_KO,
        },
        "types": out_types,
    }
    dest = os.path.join(GBL, "gbl_raids.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"saved {dest} ({os.path.getsize(dest)} bytes)")

    if missing_move:
        print(f"⚠️ 무브데이터 없음 {len(missing_move)}개: {list(missing_move)[:6]}")
    # 검증용: 물/불/드래곤 상위 12
    for tp in ("water", "fire", "dragon", "electric"):
        print(f"\n[{TYPE_KO[tp]}] 상위 12:")
        for i, r in enumerate(out_types[tp][:12], 1):
            print(f"  {i:2} {r['name']:14s} DPS {r['dps']:6.2f} ({r['rel']:5.1f}%)  {r['fastKo']}+{r['chargedKo']}")


if __name__ == "__main__":
    main()
