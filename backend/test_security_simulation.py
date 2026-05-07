"""보안 강화 변경분 시뮬레이션 테스트.

검증 대상 (이번 세션 변경):
  1. JWT_SECRET fail-fast (auth.py) + 7일 만료 + 실제 발급/검증
  2. API_BEARER_TOKEN fail-fast + CORS 와일드카드 거부 (config.py)
  3. CS 토큰 검증 강화 — 미설정 503, 잘못된 토큰 401, 정상 200
  4. invite used_at 단발성 + claim_id 동시성 (auth_router.py)
  5. chat IDOR — get_conversation_owner 분기 (chat.py)
  6. main.py 식별자 quoting

실제 Supabase/FastAPI 부팅 없이 핵심 로직을 추출/모킹해 단위 검증.
"""
from __future__ import annotations
import re
import sys
import time
import uuid
from datetime import datetime, timedelta, timezone

PASS = FAIL = 0


def check(label, got, expected):
    global PASS, FAIL
    ok = got == expected
    tag = "PASS" if ok else "FAIL"
    if ok:
        PASS += 1
        print(f"  [{tag}] {label}")
    else:
        FAIL += 1
        print(f"  [{tag}] {label}")
        print(f"         got={got!r}")
        print(f"    expected={expected!r}")


def section(name):
    print(f"\n{'='*64}\n  {name}\n{'='*64}")


# ════════════════════════════════════════════════════════════
section("1. JWT_SECRET fail-fast + 7일 만료 + 실제 발급/검증")
# ════════════════════════════════════════════════════════════
import jwt

def jwt_guard(secret: str) -> str:
    """auth.py:33-38의 가드 로직 복제."""
    secret = (secret or "").strip()
    if not secret or len(secret) < 32:
        raise RuntimeError("JWT_SECRET too weak")
    return secret

# guard
try:
    jwt_guard("")
    check("empty secret rejected", False, True)
except RuntimeError:
    check("empty secret rejected", True, True)

try:
    jwt_guard("short")
    check("short secret rejected", False, True)
except RuntimeError:
    check("short secret rejected", True, True)

strong = "A" * 48
check("strong secret accepted", jwt_guard(strong), strong)

# 실제 발급 + 만료 7일
JWT_EXPIRE_DAYS = 7
payload = {
    "sub": "user-123",
    "email": "x@y.z",
    "role": "super_admin",
    "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
}
token = jwt.encode(payload, strong, algorithm="HS256")
decoded = jwt.decode(token, strong, algorithms=["HS256"])
check("decoded sub matches", decoded["sub"], "user-123")
check("decoded role matches", decoded["role"], "super_admin")

# 다른 secret으로 디코드시 실패
try:
    jwt.decode(token, "B" * 48, algorithms=["HS256"])
    check("wrong secret rejects token", False, True)
except jwt.InvalidSignatureError:
    check("wrong secret rejects token", True, True)

# 만료 7일 검증
exp_seconds = (decoded["exp"] - int(time.time()))
check("exp ≈ 7 days (within 60s)", 7*86400 - 60 < exp_seconds <= 7*86400, True)

# 만료된 토큰 거부
expired = jwt.encode(
    {"sub": "u", "exp": datetime.now(timezone.utc) - timedelta(seconds=1)},
    strong, algorithm="HS256",
)
try:
    jwt.decode(expired, strong, algorithms=["HS256"])
    check("expired token rejected", False, True)
except jwt.ExpiredSignatureError:
    check("expired token rejected", True, True)


# ════════════════════════════════════════════════════════════
section("2. API_BEARER_TOKEN + CORS 가드 (config.py)")
# ════════════════════════════════════════════════════════════
_BAD = {"", "change-me", "changeme", "test", "default"}

def bearer_guard(token: str) -> str:
    if not token or token.strip().lower() in _BAD or len(token) < 16:
        raise RuntimeError("bearer too weak")
    return token

cases = [
    ("empty", "", False),
    ("change-me", "change-me", False),
    ("CHANGE-ME upper", "CHANGE-ME", False),
    ("12 chars", "a" * 12, False),
    ("16 chars random", "k" * 16, True),
    ("strong", "k" * 32, True),
]
for label, val, expect_ok in cases:
    try:
        bearer_guard(val)
        check(f"bearer '{label}'", True, expect_ok)
    except RuntimeError:
        check(f"bearer '{label}'", False, expect_ok)

def cors_guard(s: str):
    origins = [o.strip() for o in s.split(",") if o.strip()]
    if "*" in origins:
        raise RuntimeError("wildcard rejected")
    return origins

try:
    cors_guard("*")
    check("CORS wildcard rejected", False, True)
except RuntimeError:
    check("CORS wildcard rejected", True, True)

try:
    cors_guard("https://a.com,*")
    check("CORS mixed wildcard rejected", False, True)
except RuntimeError:
    check("CORS mixed wildcard rejected", True, True)

check("CORS normal", cors_guard("http://localhost:3000,https://app.x.com"),
      ["http://localhost:3000", "https://app.x.com"])


# ════════════════════════════════════════════════════════════
section("3. CS 토큰 검증 (cs.py:_verify_cs_token)")
# ════════════════════════════════════════════════════════════
import hmac

class HTTPException(Exception):
    def __init__(self, status_code, detail=""):
        self.status_code = status_code
        self.detail = detail

def make_cs_verifier(cs_token: str, allow_unauth: bool = False):
    """cs.py:46-65 로직 복제."""
    cs_token = (cs_token or "").strip()
    def verify(x_cs_token=None, x_maeyo_token=None):
        if not cs_token:
            if allow_unauth:
                return
            raise HTTPException(503, "MAEYO_INTERNAL_TOKEN 미설정")
        token = (x_cs_token or x_maeyo_token or "").strip()
        if not token or not hmac.compare_digest(token, cs_token):
            raise HTTPException(401, "Invalid CS token")
    return verify

# 미설정시 503
v = make_cs_verifier("")
try:
    v(x_cs_token="anything")
    check("empty token → 503", False, True)
except HTTPException as e:
    check("empty token → 503 (not skip!)", e.status_code, 503)

# 명시적 dev override
v_dev = make_cs_verifier("", allow_unauth=True)
try:
    v_dev(x_cs_token=None)
    check("CS_ALLOW_UNAUTH=1 → skip", True, True)
except HTTPException:
    check("CS_ALLOW_UNAUTH=1 → skip", False, True)

# 정상 토큰 설정 후
secret = "supersecret-cs-token-123456"
v = make_cs_verifier(secret)
try:
    v(x_cs_token=secret)
    check("올바른 토큰 → 통과", True, True)
except HTTPException:
    check("올바른 토큰 → 통과", False, True)

try:
    v(x_cs_token="wrong")
    check("잘못된 토큰 → 401", False, True)
except HTTPException as e:
    check("잘못된 토큰 → 401", e.status_code, 401)

try:
    v(x_cs_token=None, x_maeyo_token=secret)
    check("X-Maeyo-Token 폴백 → 통과", True, True)
except HTTPException:
    check("X-Maeyo-Token 폴백 → 통과", False, True)

try:
    v(x_cs_token=None, x_maeyo_token=None)
    check("헤더 없음 → 401", False, True)
except HTTPException as e:
    check("헤더 없음 → 401", e.status_code, 401)


# ════════════════════════════════════════════════════════════
section("4. invite used_at + claim_id 동시성 (auth_router.py:_find_invite, join)")
# ════════════════════════════════════════════════════════════
import secrets as secrets_mod
import threading

class FakeSnapshotsTable:
    """supabase-py 체이닝 흉내. atomic update를 lock으로 시뮬."""
    def __init__(self, rows):
        self.rows = rows
        self.lock = threading.Lock()
        self._reset()
    def _reset(self):
        self._select = None
        self._filters = []
        self._update_payload = None
        self._update_mode = False
    def select(self, *a):
        self._select = a; return self
    def update(self, payload):
        self._update_payload = payload; self._update_mode = True; return self
    def eq(self, k, v):
        self._filters.append(("eq", k, v)); return self
    def gt(self, k, v):
        self._filters.append(("gt", k, v)); return self
    def is_(self, k, v):
        self._filters.append(("is", k, v)); return self
    def execute(self):
        # WHERE 적용
        sel = []
        for r in self.rows:
            ok = True
            for op, k, v in self._filters:
                if op == "eq" and r.get(k) != v: ok = False; break
                if op == "gt" and not (r.get(k) and r[k] > v): ok = False; break
                if op == "is" and v == "null":
                    # JSON path: payload->>used_at
                    if k.startswith("payload->>"):
                        field = k.split(">>", 1)[1]
                        if (r.get("payload") or {}).get(field) is not None:
                            ok = False; break
                    else:
                        if r.get(k) is not None:
                            ok = False; break
            if ok: sel.append(r)
        # UPDATE 면 atomic하게 적용
        if self._update_mode:
            with self.lock:
                # lock 안에서 다시 필터 평가 (compare_and_swap)
                fresh = []
                for r in self.rows:
                    ok = True
                    for op, k, v in self._filters:
                        if op == "eq" and r.get(k) != v: ok = False; break
                        if op == "is" and v == "null" and k.startswith("payload->>"):
                            field = k.split(">>", 1)[1]
                            if (r.get("payload") or {}).get(field) is not None:
                                ok = False; break
                    if ok: fresh.append(r)
                for r in fresh:
                    for k, v in self._update_payload.items():
                        r[k] = v
                result_rows = [dict(r) for r in fresh]
            self._reset()
            class R: pass
            R.data = result_rows
            return R()
        self._reset()
        class R: pass
        R.data = [dict(r) for r in sel]
        return R()


def find_invite(table: FakeSnapshotsTable, token: str):
    """auth_router.py:_find_invite 로직 복제."""
    if not token or len(token) < 16:
        return None
    now_iso = datetime.now(timezone.utc).isoformat()
    resp = table.select("*").eq("kind", "invite").gt("valid_until", now_iso).execute()
    for row in (resp.data or []):
        payload = row.get("payload") or {}
        stored = payload.get("token") or ""
        if not stored: continue
        if payload.get("used_at"): continue
        if hmac.compare_digest(str(stored), str(token)):
            return row
    return None


def join_one(table: FakeSnapshotsTable, token: str, results: list, idx: int):
    """join 동시성 핵심 로직 (DB 부분만)."""
    row = find_invite(table, token)
    if not row:
        results.append((idx, "no_invite")); return
    payload = dict(row.get("payload") or {})
    if payload.get("used_at"):
        results.append((idx, "already_used")); return
    claim_id = secrets_mod.token_urlsafe(16)
    now = datetime.now(timezone.utc).isoformat()
    past = "2000-01-01T00:00:00+00:00"
    payload["used_at"] = now
    payload["claim_id"] = claim_id
    claim = (
        table.update({"payload": payload, "valid_until": past})
        .eq("id", row["id"])
        .is_("payload->>used_at", "null")
        .execute()
    )
    rows = claim.data or []
    if not rows:
        results.append((idx, "race_lost_at_update")); return
    if (rows[0].get("payload") or {}).get("claim_id") != claim_id:
        results.append((idx, "race_lost_claim_id")); return
    results.append((idx, "joined"))


# 4-1. 짧은 토큰 거부
table = FakeSnapshotsTable([])
check("invite 짧은 토큰 (<16) None", find_invite(table, "short"), None)
check("invite 빈 토큰 None", find_invite(table, ""), None)

# 4-2. 정상 토큰 단일 join
valid_token = secrets_mod.token_urlsafe(24)
future = (datetime.now(timezone.utc) + timedelta(days=7)).isoformat()
table = FakeSnapshotsTable([{
    "id": "invite-1", "kind": "invite",
    "valid_until": future,
    "payload": {"token": valid_token, "role": "super_admin"},
}])
results = []
join_one(table, valid_token, results, 0)
check("정상 단일 join 성공", results[0][1], "joined")
# 두 번째 시도는 거부돼야
results = []
join_one(table, valid_token, results, 1)
check("같은 토큰 재사용 거부", results[0][1] in ("already_used", "no_invite"), True)

# 4-3. 동시 join (10개 thread) → 정확히 1개만 성공
table = FakeSnapshotsTable([{
    "id": "invite-2", "kind": "invite",
    "valid_until": future,
    "payload": {"token": valid_token, "role": "super_admin"},
}])
results = []
threads = [threading.Thread(target=join_one, args=(table, valid_token, results, i)) for i in range(10)]
for t in threads: t.start()
for t in threads: t.join()
joined_count = sum(1 for _, r in results if r == "joined")
check("동시 10명 → 정확히 1명만 join", joined_count, 1)
# race 잃은 thread는 다음 중 하나:
#   - find_invite 단계에서 used_at 체크에 막힘 → "no_invite"
#   - find_invite는 통과했지만 update의 conditional WHERE에 막힘 → "race_lost_at_update"
#   - update는 통과했지만 다른 thread가 더 늦게 덮어씀 → "race_lost_claim_id"
#   - find_invite 직후 in-Python check에 막힘 → "already_used"
loser_statuses = ("no_invite", "race_lost_at_update", "race_lost_claim_id", "already_used")
loser_count = sum(1 for _, r in results if r in loser_statuses)
check("나머지 9명 모두 race 패배로 분류", loser_count, 9)
print(f"         results: {sorted([r for _, r in results])}")

# 4-4. 만료된 invite 거부
expired_token = secrets_mod.token_urlsafe(24)
past_iso = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
table = FakeSnapshotsTable([{
    "id": "invite-3", "kind": "invite",
    "valid_until": past_iso,
    "payload": {"token": expired_token, "role": "super_admin"},
}])
check("만료된 invite None", find_invite(table, expired_token), None)


# ════════════════════════════════════════════════════════════
section("5. chat IDOR 방어 (chat.py:get_conversation)")
# ════════════════════════════════════════════════════════════

class UserCtx:
    def __init__(self, id, is_super_admin):
        self.id = id
        self.is_super_admin = is_super_admin

CONVS = {
    "conv-A": {"user_id": "user-A"},
    "conv-B": {"user_id": "user-B"},
    "conv-legacy": {"user_id": None},  # owner 없는 legacy
}
def get_conversation_owner(cid):
    return CONVS.get(cid, {}).get("user_id") if cid in CONVS else None

def get_conversation(cid, user):
    """chat.py:715-724 분기 로직."""
    if not user.is_super_admin:
        owner = get_conversation_owner(cid)
        if owner is None or str(owner) != str(user.id):
            raise HTTPException(404, "대화 없음")
    return {"conversation_id": cid, "messages": []}

admin = UserCtx("admin-1", True)
userA = UserCtx("user-A", False)
userB = UserCtx("user-B", False)

# admin은 전부 OK
try:
    get_conversation("conv-A", admin)
    get_conversation("conv-B", admin)
    get_conversation("conv-legacy", admin)
    check("admin은 모든 conversation 접근", True, True)
except HTTPException:
    check("admin은 모든 conversation 접근", False, True)

# userA는 본인 것만
try:
    get_conversation("conv-A", userA)
    check("userA → conv-A 접근 가능", True, True)
except HTTPException:
    check("userA → conv-A 접근 가능", False, True)

try:
    get_conversation("conv-B", userA)
    check("userA → conv-B (남의 것) 차단", False, True)
except HTTPException as e:
    check("userA → conv-B (남의 것) 차단", e.status_code, 404)

try:
    get_conversation("conv-legacy", userA)
    check("userA → owner 없는 legacy 차단", False, True)
except HTTPException as e:
    check("userA → owner 없는 legacy 차단", e.status_code, 404)

try:
    get_conversation("conv-XYZ", userA)
    check("userA → 존재하지 않는 conv 차단", False, True)
except HTTPException as e:
    check("userA → 존재하지 않는 conv 차단", e.status_code, 404)


# ════════════════════════════════════════════════════════════
section("6. main.py 식별자 quoting (SQL injection 방어)")
# ════════════════════════════════════════════════════════════

ident_re = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")

def safe_count_query(tbl: str) -> str | None:
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", tbl or ""):
        return None
    return f'SELECT COUNT(*) AS n FROM "{tbl}"'

check("정상 테이블명", safe_count_query("naver_ad_sync_log"),
      'SELECT COUNT(*) AS n FROM "naver_ad_sync_log"')
check("스키마.테이블 거부", safe_count_query("public.users"), None)
check("SQL injection 시도 거부", safe_count_query("users; DROP TABLE x;--"), None)
check("공백 거부", safe_count_query("user table"), None)
check("숫자 시작 거부", safe_count_query("1users"), None)
check("따옴표 포함 거부", safe_count_query('users"; DELETE'), None)
check("빈 문자열 거부", safe_count_query(""), None)


# ════════════════════════════════════════════════════════════
print(f"\n{'='*64}\n  결과: PASS={PASS}  FAIL={FAIL}\n{'='*64}")
sys.exit(0 if FAIL == 0 else 1)
