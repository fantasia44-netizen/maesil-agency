"""
SQL 029 검증 테스트 — maeyo_l2_scripts.user_role 컬럼

실행: python test_029_user_role.py
"""
import os, sys, json
sys.path.insert(0, os.path.dirname(__file__))

PASS = "[PASS]"
FAIL = "[FAIL]"
results = []

def check(label: str, ok: bool, detail: str = ""):
    status = PASS if ok else FAIL
    msg = f"{status} {label}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    results.append(ok)

try:
    from app.db.maesil_total_client import get_maesil_total_client
    client = get_maesil_total_client()
    print("DB 연결 성공\n")
except Exception as e:
    print(f"{FAIL} DB 연결 실패: {e}")
    sys.exit(1)

# ── 1. user_role 컬럼 존재 여부 ──────────────────────────────────
try:
    resp = (
        client.schema("agent_work")
        .table("maeyo_l2_scripts")
        .select("id,user_role")
        .limit(1)
        .execute()
    )
    check("user_role 컬럼 존재", True, f"rows={len(resp.data)}")
except Exception as e:
    check("user_role 컬럼 존재", False, str(e))

# ── 2. NULL(공통) 레코드 조회 ────────────────────────────────────
try:
    resp = (
        client.schema("agent_work")
        .table("maeyo_l2_scripts")
        .select("id,program,user_role")
        .is_("user_role", "null")
        .limit(5)
        .execute()
    )
    check("NULL(공통) 레코드 조회", True, f"count={len(resp.data)}")
except Exception as e:
    check("NULL(공통) 레코드 조회", False, str(e))

# ── 3. CHECK 제약 — 유효한 값('seller') INSERT 테스트 ────────────
import uuid
test_id = str(uuid.uuid4())
try:
    resp = (
        client.schema("agent_work")
        .table("maeyo_l2_scripts")
        .insert({
            "id":        test_id,
            "program":   "maesil-insight",
            "user_role": "seller",
            "triggers":  ["테스트 트리거"],
            "message":   "테스트 메시지",
            "is_active": False,
            "status":    "draft",
        })
        .execute()
    )
    check("seller 역할 INSERT", True)

    # 정리
    client.schema("agent_work").table("maeyo_l2_scripts").delete().eq("id", test_id).execute()
except Exception as e:
    check("seller 역할 INSERT", False, str(e))

# ── 4. CHECK 제약 — 잘못된 값('admin') 거부 확인 ─────────────────
bad_id = str(uuid.uuid4())
try:
    client.schema("agent_work").table("maeyo_l2_scripts").insert({
        "id":        bad_id,
        "program":   "maesil-insight",
        "user_role": "admin",   # 허용되지 않는 값
        "triggers":  ["x"],
        "message":   "x",
        "is_active": False,
        "status":    "draft",
    }).execute()
    # 성공하면 잘못된 것 → 정리 후 FAIL
    client.schema("agent_work").table("maeyo_l2_scripts").delete().eq("id", bad_id).execute()
    check("잘못된 user_role 거부(CHECK)", False, "admin이 허용됨 — CHECK 제약 미작동")
except Exception as e:
    check("잘못된 user_role 거부(CHECK)", True, "admin 삽입 거부 확인")

# ── 5. maeyo_engine _load_l2_scripts user_role 파라미터 ──────────
try:
    from app.services.maeyo_engine import _load_l2_scripts, _l2_cache_key
    key_seller = _l2_cache_key("maesil-insight", "seller")
    key_common = _l2_cache_key("maesil-insight", None)
    check("캐시 키 분리", key_seller != key_common,
          f"seller='{key_seller}' / common='{key_common}'")

    scripts = _load_l2_scripts("maesil-insight", "seller")
    check("seller 역할 L2 로드", isinstance(scripts, list),
          f"scripts={len(scripts)}")

    scripts_common = _load_l2_scripts("maesil-insight", None)
    check("공통(None) L2 로드", isinstance(scripts_common, list),
          f"scripts={len(scripts_common)}")
except Exception as e:
    check("maeyo_engine user_role 로드", False, str(e))

# ── 6. agency_client import ──────────────────────────────────────
try:
    from app.services.agency_client import post_growth_chat, build_operator_context
    ctx = build_operator_context(
        plan_type="pro",
        company_name="테스트업체",
        user_role="partner",
        connected_channels=["스마트스토어"],
    )
    check("agency_client import + build_operator_context", True,
          f"ctx keys={list(ctx.keys())}")
except Exception as e:
    check("agency_client import", False, str(e))

# ── 결과 요약 ────────────────────────────────────────────────────
print(f"\n{'='*40}")
passed = sum(results)
total  = len(results)
print(f"결과: {passed}/{total} 통과 {'✓ 전체 통과' if passed == total else '✗ 실패 있음'}")
