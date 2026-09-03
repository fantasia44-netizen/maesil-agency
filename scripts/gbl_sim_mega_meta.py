#!/usr/bin/env python3
"""시뮬레이터 메가 리그 메타 풀 생성 — PvPoke mega 랭킹 top100 → {s,m,sc}.

메가 리그(great/ultra/master_mega)는 s28 브랜치에 2500/10000 랭킹이 미산출(null 스텁)이라
산출 완료된 master 브랜치의 mega 랭킹을 사용(gbl_compile_detail.py와 동일 방침).
    python scripts/gbl_sim_mega_meta.py
"""
import json
import os
import urllib.request

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "frontend", "app", "[lang]", "gbl", "sim", "pvpoke")
BASE = "https://raw.githubusercontent.com/pvpoke/pvpoke/master/src/data/rankings/mega/overall"
FILES = {"great_mega": "rankings-1500.json", "ultra_mega": "rankings-2500.json", "master_mega": "rankings-10000.json"}
TOP_N = 100


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "gbl-note sim mega meta"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    for league, fn in FILES.items():
        raw = fetch(f"{BASE}/{fn}")
        ranked = [r for r in raw if (r.get("score") or 0) > 0]
        ranked.sort(key=lambda r: r.get("score") or 0, reverse=True)
        pool = [{"s": r["speciesId"], "m": r.get("moveset", []), "sc": round(r.get("score") or 0, 1)}
                for r in ranked[:TOP_N]]
        dest = os.path.join(OUT, f"meta_{league}_s28.json")
        json.dump(pool, open(dest, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
        n3 = sum(1 for p in pool if len(p["m"]) >= 4)
        print(f"saved meta_{league}_s28.json  {len(pool)}종 (3차지 메가 {n3}종)  top={pool[0]['s']}")


if __name__ == "__main__":
    main()
