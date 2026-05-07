"""다음 세션의 Claude / dev_chat_agent가 한 줄로 회귀 검증을 돌릴 수 있는 entry.

사용:
  cd backend && python run_checks.py
  또는: PYTHONIOENCODING=utf-8 python backend/run_checks.py

동작:
  1) backend/app 전체 syntax compileall
  2) backend/test_*.py 모두 자동 발견 후 순차 실행
  3) 어느 하나라도 FAIL이면 exit 1

dev_chat_agent가 PR 만들기 전에 호출하면 회귀 자동 검증 가능.
"""
from __future__ import annotations
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
APP_DIR = ROOT / "app"

# Windows 콘솔 한글 깨짐 + 유니코드 문자 대응
ENV = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}

print(f"\n{'='*64}\n  STEP 1/2: compileall {APP_DIR}\n{'='*64}")
r = subprocess.run([sys.executable, "-m", "compileall", "-q", str(APP_DIR)], env=ENV)
if r.returncode != 0:
    print("COMPILE FAIL — syntax 오류")
    sys.exit(1)
print("compileall OK")

tests = sorted(ROOT.glob("test_*.py"))
print(f"\n{'='*64}\n  STEP 2/2: {len(tests)}개 테스트 실행\n{'='*64}")

# 각 test 파일의 마지막 PASS/FAIL 카운트를 수집
agg_pass = agg_fail = 0
failures = []
for t in tests:
    print(f"\n----- {t.name} -----")
    proc = subprocess.run(
        [sys.executable, str(t)],
        env=ENV, capture_output=True, text=True, encoding="utf-8",
    )
    out = (proc.stdout or "") + (proc.stderr or "")
    # 마지막 결과 라인 추출 (다양한 포맷 지원)
    m = re.search(r"PASS\s*=\s*(\d+).*?FAIL\s*=\s*(\d+)", out)
    if not m:
        m = re.search(r"(\d+)\s*/\s*\d+\s*PASSED", out)
        if m:
            agg_pass += int(m.group(1))
            tail = out.rstrip().splitlines()[-3:]
            print("\n".join(tail))
            if proc.returncode != 0:
                failures.append(t.name)
                agg_fail += 1
            continue
    if m:
        p, f = int(m.group(1)), int(m.group(2))
        agg_pass += p
        agg_fail += f
        if f > 0 or proc.returncode != 0:
            failures.append(f"{t.name}: PASS={p} FAIL={f}")
            print(out)
        else:
            tail = out.rstrip().splitlines()[-3:]
            print("\n".join(tail))
    else:
        # 결과 라인 못 찾음 → 출력 그대로 보여줌
        print(out)
        if proc.returncode != 0:
            failures.append(f"{t.name}: parse 실패 (exit {proc.returncode})")
            agg_fail += 1

print(f"\n{'='*64}\n  최종: PASS={agg_pass}  FAIL={agg_fail}\n{'='*64}")
if failures:
    print("실패한 테스트:")
    for f in failures:
        print(f"  - {f}")
    sys.exit(1)
print("ALL CLEAR — 배포 가능 상태")
sys.exit(0)
