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
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GBL = os.path.join(REPO, "frontend", "app", "gbl")

PVPOKE = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/all/overall"
GAMEMASTER = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/gamemaster.json"
FILES = {"great": "rankings-1500.json", "ultra": "rankings-2500.json", "master": "rankings-10000.json"}
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


def moveset_detail(moveset: list, MV: dict) -> dict | None:
    """추천 기술배치 → 빠른기술(획득·턴) + 차지별 연속 타수 시퀀스."""
    if not moveset:
        return None
    f = MV.get(moveset[0], {})
    gain = f.get("gain", 0)
    charged = []
    for cid in moveset[1:]:
        c = MV.get(cid, {})
        charged.append({"id": cid, "energy": c.get("energy", 0), "counts": taus_seq(c.get("energy", 0), gain)})
    return {"fast": {"id": moveset[0], "gain": gain, "turns": f.get("turns", 1)}, "charged": charged}


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


_REG = [("_alolan", "알로라 "), ("_galarian", "가라르 "), ("_hisuian", "히스이 "), ("_paldean", "팔데아 ")]


def disp_ko(sid: str, sp: dict, pdko: dict) -> tuple:
    """speciesId → (한글표시명, dex, types[]). gbl_data에 없는 신규/폼 포함용."""
    p = sp.get(sid, {})
    dex = p.get("dex")
    base = pdko.get(str(dex)) if dex else None
    if not base:
        return None, dex, [t for t in (p.get("types") or []) if t and t != "none"]
    reg = next((k for suf, k in _REG if suf in sid), "")
    if "_mega_x" in sid: name = "메가 " + base + " X"
    elif "_mega_y" in sid: name = "메가 " + base + " Y"
    elif "_mega" in sid: name = "메가 " + reg + base
    elif "_primal" in sid: name = "원시 " + base
    elif "_white" in sid: name = "화이트 " + base
    elif "_black" in sid: name = "블랙 " + base
    else: name = reg + base
    if "_origin" in sid: name += " (오리진)"
    elif "_therian" in sid: name += " (영물폼)"
    if "_shadow" in sid or sid.endswith("_shadow"): name = "그림자 " + name
    types = [t for t in (p.get("types") or []) if t and t != "none"]
    return name, dex, types


def main() -> None:
    data = json.load(open(os.path.join(GBL, "gbl_data.json"), encoding="utf-8"))
    ko = {m["id"]: m["ko"] for lg in data["leagues"].values() for m in lg["pokemon"]}
    MV = move_mechanics()
    sp = {p["speciesId"]: p for p in fetch(GAMEMASTER)["pokemon"]}  # 한글명·dex·타입 소스
    pdko = json.load(open(os.path.join(GBL, "pokedex_ko.json"), encoding="utf-8"))

    out = {}
    for league, fn in FILES.items():
        ranks = [r for r in fetch(f"{PVPOKE}/{fn}") if r.get("score", 0) > 0][:TOP_N]
        mx = max(r.get("score", 0) for r in ranks)
        mons = []
        for r in ranks:
            dko, ddex, dtypes = disp_ko(r["speciesId"], sp, pdko)
            mons.append({
                "id": r["speciesId"],
                "ko": dko, "dex": ddex, "types": dtypes,  # 자체 내장(gbl_data 미커버 대비)
                "score": round(r.get("score", 0)),
                "tier": tier_of(r.get("score", 0), mx),
                "moveset": r.get("moveset", []),
                "mv": moveset_detail(r.get("moveset", []), MV),  # 빠른기술 획득·턴 + 차지별 타수
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

    dest = os.path.join(GBL, "gbl_detail.json")
    json.dump(out, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"saved {dest} ({os.path.getsize(dest)} bytes)")


if __name__ == "__main__":
    main()
