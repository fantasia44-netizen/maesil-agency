"""
test_secrets_tenant_simulation.py — Phase 3A: 테넌트별 시크릿 + 전역 fallback 검증.

get_tenant_secret: (tenant,name) 우선 → 없으면 전역(tenant_id NULL) fallback.
get_secret: 전역만. gmail_sender.is_configured(tenant_id): 테넌트/전역 해석.
"""
import os, sys
os.environ.setdefault("MAESIL_TOTAL_SUPABASE_URL", "http://sim.local")
os.environ.setdefault("MAESIL_TOTAL_SERVICE_ROLE_KEY", "sim")
os.environ.setdefault("JWT_SECRET", "x" * 40)

PASS = FAIL = 0
def check(n, got, exp):
    global PASS, FAIL
    if got == exp: PASS += 1; print(f"  [PASS] {n}")
    else: FAIL += 1; print(f"  [FAIL] {n}\n     got={got!r} exp={exp!r}")


# 인메모리 secrets 테이블
ROWS = []  # {tenant_id, name, value}
class Q:
    def __init__(s): s.flt = []; s._not = False; s.op = None
    def select(s, *a, **k): return s
    def eq(s, c, v): s.flt.append(("eq", c, v)); return s
    @property
    def not_(s): s._not = True; return s
    def is_(s, c, v): s.flt.append(("isnull", c)); return s
    def limit(s, n): return s
    def insert(s, p): s.op = ("ins", p); return s
    def update(s, p): s.op = ("upd", p); return s
    def execute(s):
        if s.op:
            kind, p = s.op
            if kind == "ins": ROWS.append(dict(p))
            elif kind == "upd":
                for r in ROWS:
                    if s._match(r): r.update(p)
            return type("R", (), {"data": []})()
        out = [r for r in ROWS if s._match(r)]
        return type("R", (), {"data": [dict(r) for r in out]})()
    def _match(s, r):
        for f in s.flt:
            if f[0] == "eq" and r.get(f[1]) != f[2]: return False
            if f[0] == "isnull" and r.get(f[1]) is not None: return False
        return True

import app.services.secrets as sec
sec._table = lambda: Q()
sec._touch_last_used = lambda *a, **k: None

def reset():
    ROWS.clear()
    sec.invalidate_cache(None)


# ── 1. get_secret = 전역만 ──────────────────────────────
reset()
ROWS.append({"tenant_id": None, "name": "k", "value": "GLOBAL"})
ROWS.append({"tenant_id": "t1", "name": "k", "value": "T1VAL"})
check("get_secret → 전역값", sec.get_secret("k"), "GLOBAL")

# ── 2. get_tenant_secret(t1) → 테넌트값 우선 ────────────
reset()
ROWS.append({"tenant_id": None, "name": "k", "value": "GLOBAL"})
ROWS.append({"tenant_id": "t1", "name": "k", "value": "T1VAL"})
check("get_tenant_secret(t1) → 테넌트값", sec.get_tenant_secret("t1", "k"), "T1VAL")

# ── 3. 테넌트 값 없으면 전역 fallback ───────────────────
reset()
ROWS.append({"tenant_id": None, "name": "k", "value": "GLOBAL"})
check("get_tenant_secret(t2) → 전역 fallback", sec.get_tenant_secret("t2", "k"), "GLOBAL")

# ── 4. 둘 다 없으면 None ────────────────────────────────
reset()
check("없으면 None", sec.get_tenant_secret("t9", "nope"), None)

# ── 5. tenant_id=None → get_secret과 동일 ───────────────
reset()
ROWS.append({"tenant_id": None, "name": "k", "value": "GLOBAL"})
check("tenant_id None → 전역", sec.get_tenant_secret(None, "k"), "GLOBAL")

# ── 6. upsert_tenant_secret 저장 후 조회 ────────────────
reset()
sec.upsert_tenant_secret("t1", "outreach_gmail_client_id", "CID-T1", "oauth")
check("upsert_tenant_secret 후 조회", sec.get_tenant_secret("t1", "outreach_gmail_client_id"), "CID-T1")
check("다른 테넌트엔 안 보임(fallback도 없음)", sec.get_tenant_secret("t2", "outreach_gmail_client_id"), None)

# ── 7. gmail_sender.is_configured 테넌트 해석 ───────────
reset()
import app.services.outreach_gmail_sender as gm
# 전역에 3종 → super_admin(전역) configured, 신규 테넌트는 fallback으로 configured
for n in ("outreach_gmail_client_id", "outreach_gmail_client_secret", "outreach_gmail_refresh_token"):
    ROWS.append({"tenant_id": None, "name": n, "value": "G"})
check("전역 3종 → is_configured(None) True", gm.is_configured(None), True)
check("신규 테넌트 → 전역 fallback으로 True", gm.is_configured("t5"), True)

reset()
# 전역 없음 → 신규 테넌트 not configured
check("전역 없음 → is_configured(t5) False", gm.is_configured("t5"), False)
# t5가 자기 3종 저장 → configured
for n in ("outreach_gmail_client_id", "outreach_gmail_client_secret", "outreach_gmail_refresh_token"):
    sec.upsert_tenant_secret("t5", n, "T5", "oauth")
check("테넌트 3종 저장 → is_configured(t5) True", gm.is_configured("t5"), True)
check("다른 테넌트(t6)는 여전히 False", gm.is_configured("t6"), False)


print("\n" + "=" * 56)
print(f"  결과: PASS={PASS}  FAIL={FAIL}")
print("=" * 56)
sys.exit(1 if FAIL else 0)
