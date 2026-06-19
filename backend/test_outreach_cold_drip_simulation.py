"""
test_outreach_cold_drip_simulation.py — cold_drip top-up + 자격확대 + followup 분리 검증.

실 DB/Gmail 없이 인메모리 가짜 Supabase + 시간 고정으로 검증:
  1. _eligible_leads — youtube+naver, approved, S~C, 이메일有, 미발송만
  2. schedule_daily_cold_drip top-up — 매 호출 cap까지 부족분만 추가, 중복 예약 없음, cap 도달 시 중단
  3. check_pending_followups 분리 — 1차(seq=1)는 한도 무관 발송, 팔로업은 FOLLOWUP_DAILY_CAP 적용
"""
import os
import sys
import datetime as _dt

os.environ.setdefault("MAESIL_TOTAL_SUPABASE_URL", "http://sim.local")
os.environ.setdefault("MAESIL_TOTAL_SERVICE_ROLE_KEY", "sim-key")

PASS = 0
FAIL = 0


def check(name, got, expected):
    global PASS, FAIL
    if got == expected:
        PASS += 1
        print(f"  [PASS] {name}")
    else:
        FAIL += 1
        print(f"  [FAIL] {name}\n         got={got!r}\n         exp={expected!r}")


def section(title):
    print("\n" + "=" * 62 + f"\n  {title}\n" + "=" * 62)


# ── 인메모리 가짜 Supabase ─────────────────────────────────────────
class FakeResp:
    def __init__(self, data, count=None):
        self.data = data
        self.count = count


class FakeQuery:
    def __init__(self, store, table):
        self.store = store
        self.table_name = table
        self.filters = []
        self.count_mode = None
        self.order_col = None
        self.order_desc = False
        self.limit_n = None
        self.op = None
        self._not = False

    def select(self, *cols, count=None):
        self.count_mode = count
        return self

    def eq(self, c, v): self.filters.append(("eq", c, v)); return self
    def in_(self, c, v): self.filters.append(("in", c, list(v))); return self
    def gte(self, c, v): self.filters.append(("gte", c, v)); return self
    def lte(self, c, v): self.filters.append(("lte", c, v)); return self
    def lt(self, c, v): self.filters.append(("lt", c, v)); return self
    def gt(self, c, v): self.filters.append(("gt", c, v)); return self

    def is_(self, c, v):
        self.filters.append(("not_is_null" if self._not else "is_null", c, v)); self._not = False; return self

    @property
    def not_(self):
        self._not = True; return self

    def order(self, c, desc=False): self.order_col = c; self.order_desc = desc; return self
    def limit(self, n): self.limit_n = n; return self
    def insert(self, p): self.op = ("insert", p); return self
    def update(self, p): self.op = ("update", p); return self
    def delete(self): self.op = ("delete", None); return self

    def _match(self, row):
        for kind, col, val in self.filters:
            v = row.get(col)
            if kind == "eq" and v != val: return False
            if kind == "in" and v not in val: return False
            if kind == "gte" and (v is None or v < val): return False
            if kind == "lte" and (v is None or v > val): return False
            if kind == "lt" and (v is None or v >= val): return False
            if kind == "gt" and (v is None or v <= val): return False
            if kind == "is_null" and v is not None: return False
            if kind == "not_is_null" and v is None: return False
        return True

    def execute(self):
        rows = self.store.tables.setdefault(self.table_name, [])
        if self.op:
            kind, payload = self.op
            if kind == "insert":
                items = payload if isinstance(payload, list) else [payload]
                for it in items:
                    it = dict(it)
                    if "id" not in it:
                        self.store.seq += 1
                        it["id"] = f"tp{self.store.seq}"
                    rows.append(it)
                return FakeResp(items)
            if kind == "update":
                m = [r for r in rows if self._match(r)]
                for r in m:
                    r.update(payload)
                return FakeResp(m)
            if kind == "delete":
                keep = [r for r in rows if not self._match(r)]
                removed = len(rows) - len(keep)
                self.store.tables[self.table_name] = keep
                return FakeResp([{"removed": removed}])
        out = [r for r in rows if self._match(r)]
        if self.order_col is not None:
            out = sorted(out, key=lambda r: (r.get(self.order_col) is not None, r.get(self.order_col)),
                         reverse=self.order_desc)
        if self.limit_n is not None:
            out = out[: self.limit_n]
        cnt = len([r for r in rows if self._match(r)]) if self.count_mode else None
        return FakeResp([dict(r) for r in out], count=cnt)


class FakeDB:
    def __init__(self):
        self.tables = {"outreach_leads": [], "outreach_touchpoints": []}
        self.seq = 0

    def schema(self, _): return self
    def table(self, n): return FakeQuery(self, n)


# ── 시간 고정: 2026-06-15(월) 10:00 KST (업무시간 내, 평일) ──────────
import app.services.outreach_cold_drip as drip
import app.services.outreach_followup as followup
import app.services.outreach_suppression as supp

_FIXED_KST = _dt.datetime(2026, 6, 15, 10, 0, 0, tzinfo=drip._KST)


class FakeDateTime(_dt.datetime):
    @classmethod
    def now(cls, tz=None):
        return _FIXED_KST.astimezone(tz) if tz else _FIXED_KST.replace(tzinfo=None)


drip.datetime = FakeDateTime
check("고정 시각이 평일", _FIXED_KST.weekday() < 5, True)

FAKE = FakeDB()
drip._db = lambda: FAKE
followup._db = lambda: FAKE

# tenant_config: 가짜 DB(설정 테이블 없음) → settings 기본값으로 폴백
import app.services.tenant_config as tcfg
tcfg._db = lambda: FAKE
import app.services.outreach_pipeline as pipe  # noqa

# 설정/Gmail 주입
from app.config import settings
def set_settings(**kw):
    for k, v in kw.items():
        object.__setattr__(settings, k, v)
    tcfg.invalidate()   # cfg 캐시 무효화 → 다음 load_config가 새 settings 반영
set_settings(
    outreach_cold_drip_enabled=True,
    outreach_send_start_hour=8,
    outreach_send_end_hour=20,
    outreach_daily_cap=100,
    outreach_drip_grades="S,A,B,C",
)

import app.services.outreach_gmail_sender as gm
gm.is_configured = lambda *a, **k: True

supp.is_quiet_hours = lambda *a, **k: False


def reset_db():
    FAKE.tables = {"outreach_leads": [], "outreach_touchpoints": []}
    FAKE.seq = 0
    tcfg.invalidate()


def L(**kw):
    base = {"tenant_id": "t1", "contact_email": "x@y.com", "status": "approved", "grade": "B",
            "platform": "youtube", "score": 50, "handle_name": "h", "emailed_at": None}
    base.update(kw); return base


# ──────────────────────────────────────────────────────────────────
section("1. _eligible_leads — 자격 필터 (youtube+naver, approved, S~C, 미발송)")
reset_db()
FAKE.tables["outreach_leads"] = [
    L(id="y1", platform="youtube", grade="A", score=90),       # 자격O
    L(id="n1", platform="naver_blog", grade="B", score=80),    # 자격O (네이버 신규 포함)
    L(id="d1", platform="youtube", grade="D", score=70),       # X: D급
    L(id="disc", platform="youtube", grade="A", status="discovered"),  # X: 미승인
    L(id="sent", platform="youtube", grade="A", emailed_at="2026-06-10T00:00:00+00:00"),  # X: 발송됨
    L(id="noem", platform="youtube", grade="A", contact_email=None),  # X: 이메일 없음
    L(id="insta", platform="instagram", grade="A"),            # X: 플랫폼 제외
]
elig = {l["id"] for l in drip._eligible_leads("t1", 100, ["S", "A", "B", "C"])}
check("자격 리드 = youtube/naver approved S~C 미발송", elig, {"y1", "n1"})


# ──────────────────────────────────────────────────────────────────
section("2. schedule_daily_cold_drip — top-up (스냅샷 잠금 제거)")

# 2-1) 첫 호출 — 자격 리드만 seq=1 pending 예약
reset_db()
FAKE.tables["outreach_leads"] = [
    L(id="y1", platform="youtube", grade="A", score=90),
    L(id="n1", platform="naver_blog", grade="B", score=80),
]
r1 = drip.schedule_daily_cold_drip("t1")
check("첫 호출 2건 예약", r1.get("scheduled"), 2)
tps = FAKE.tables["outreach_touchpoints"]
check("seq=1 email pending 2건", sorted([(t["touch_sequence"], t["channel"], t["status"]) for t in tps]),
      [(1, "email", "pending"), (1, "email", "pending")])

# 2-2) 재호출 — 이미 예약된 리드 제외 → 중복 없음
r2 = drip.schedule_daily_cold_drip("t1")
check("재호출 추가 0건(중복 방지)", r2.get("scheduled"), 0)
check("터치포인트 여전히 2건", len(FAKE.tables["outreach_touchpoints"]), 2)

# 2-3) 새 approved 리드 등장 → top-up으로 그날 추가 예약
FAKE.tables["outreach_leads"].append(L(id="y2", platform="youtube", grade="A", score=85))
r3 = drip.schedule_daily_cold_drip("t1")
check("top-up 1건 추가 예약", r3.get("scheduled"), 1)
check("누적 3건", len(FAKE.tables["outreach_touchpoints"]), 3)

# 2-4) cap 도달 시 중단
reset_db()
set_settings(outreach_daily_cap=2)
FAKE.tables["outreach_leads"] = [L(id=f"e{i}", platform="youtube", grade="A", score=90 - i) for i in range(5)]
c1 = drip.schedule_daily_cold_drip("t1")
check("cap=2 — 첫 호출 2건", c1.get("scheduled"), 2)
c2 = drip.schedule_daily_cold_drip("t1")
check("cap 도달 → 추가 0건", c2.get("scheduled"), 0)
check("cap 도달 skip 사유", c2.get("skipped"), "daily cap reached")
set_settings(outreach_daily_cap=100)


# ──────────────────────────────────────────────────────────────────
section("3. check_pending_followups — 1차/팔로업 분리 (한도 버그 수정)")

# send 함수 모킹: 호출된 touch_sequence 기록
sent_seq = []
followup._send_cold_drip_seq1 = lambda tenant_id, lead, tid: (sent_seq.append(1) or True)
followup._send_sequence_email = lambda tenant_id, lead, seq, tid: (sent_seq.append(seq) or True)
followup._update_lead_touch_summary = lambda *a, **k: None
followup._auto_no_reply = lambda *a, **k: None
followup.datetime = FakeDateTime  # quiet-hours 무관하게 now 고정

past = "2026-06-15T00:00:00+00:00"  # 이미 지난 시각(due)


def seed_touches():
    reset_db()
    FAKE.tables["outreach_leads"] = [
        L(id="La", status="approved"),     # 1차 대상
        L(id="Lb", status="emailed"),      # 팔로업 대상
    ]
    FAKE.tables["outreach_touchpoints"] = [
        {"id": "s1", "tenant_id": "t1", "lead_id": "La", "touch_sequence": 1, "channel": "email", "status": "pending", "scheduled_for": past},
        {"id": "f2", "tenant_id": "t1", "lead_id": "Lb", "touch_sequence": 2, "channel": "email", "status": "pending", "scheduled_for": past},
    ]


# 3-1) 팔로업 한도 도달(20) — 1차는 발송, 팔로업은 차단
seed_touches()
sent_seq.clear()
followup._followup_sent_today = lambda *a: followup.FOLLOWUP_DAILY_CAP  # 한도 꽉 참
followup.check_pending_followups("t1", limit=10)
check("한도 도달 시 1차(seq=1)는 발송됨", 1 in sent_seq, True)
check("한도 도달 시 팔로업(seq=2)은 차단됨", 2 in sent_seq, False)

# 3-2) 한도 여유 — 1차 + 팔로업 모두 발송
seed_touches()
sent_seq.clear()
followup._followup_sent_today = lambda *a: 0
followup.check_pending_followups("t1", limit=10)
check("여유 시 1차 발송", 1 in sent_seq, True)
check("여유 시 팔로업도 발송", 2 in sent_seq, True)


# ──────────────────────────────────────────────────────────────────
section("4. 교차 테넌트 격리 — 한 테넌트는 다른 테넌트 리드를 못 봄")
reset_db()
set_settings(outreach_daily_cap=100)
FAKE.tables["outreach_leads"] = [
    L(id="t1a", tenant_id="t1", platform="youtube", grade="A", score=90),
    L(id="t1b", tenant_id="t1", platform="naver_blog", grade="B", score=80),
    L(id="t2a", tenant_id="t2", platform="youtube", grade="A", score=95),  # 다른 테넌트
    L(id="t2b", tenant_id="t2", platform="youtube", grade="S", score=99),
]
# t1 자격 조회 → t1 리드만
elig_t1 = {l["id"] for l in drip._eligible_leads("t1", 100, ["S", "A", "B", "C"])}
check("t1 자격 = t1 리드만", elig_t1, {"t1a", "t1b"})
# t1 예약 → t1 리드만 seq=1 생성, t2 미포함
r = drip.schedule_daily_cold_drip("t1")
check("t1 예약 2건", r.get("scheduled"), 2)
scheduled_leads = {t["lead_id"] for t in FAKE.tables["outreach_touchpoints"]}
check("t1 터치포인트에 t2 리드 없음", scheduled_leads, {"t1a", "t1b"})
check("모든 터치포인트 tenant_id=t1", all(t["tenant_id"] == "t1" for t in FAKE.tables["outreach_touchpoints"]), True)
# t2 예약 → t2 리드만 (t1 예약과 독립)
r2 = drip.schedule_daily_cold_drip("t2")
check("t2 예약 2건(독립)", r2.get("scheduled"), 2)
t2_sched = {t["lead_id"] for t in FAKE.tables["outreach_touchpoints"] if t["tenant_id"] == "t2"}
check("t2 터치포인트 = t2 리드만", t2_sched, {"t2a", "t2b"})


# ──────────────────────────────────────────────────────────────────
print("\n" + "=" * 62)
print(f"  결과: PASS={PASS}  FAIL={FAIL}")
print("=" * 62)
sys.exit(1 if FAIL else 0)
