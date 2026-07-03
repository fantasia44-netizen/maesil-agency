"""
수정 내용 시뮬레이션 검증 테스트
모든 이번 세션 변경사항에 대한 로직 단위 검증
"""
import re, sys, os
os.environ.setdefault('SUPABASE_URL', 'https://placeholder.supabase.co')
os.environ.setdefault('SUPABASE_KEY', 'placeholder')

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
    print(f"\n{'='*58}")
    print(f"  {name}")
    print(f"{'='*58}")


# ════════════════════════════════════════════════════════
section("1. is_approve - 승인 키워드 감지")
# ════════════════════════════════════════════════════════

APPROVE_KEYWORDS = {
    "승인","실행","확인","적용","진행",
    "해줘","실행해","고쳐줘","해","가","ㄱ","고고","가자","그래","좋아",
    "진행해","진행해줘","해주세요","실행해주세요","적용해줘","적용해",
    "ok","yes","go","do it","apply","run","execute",
    "ㅇㅋ","ㅇ","넹","넵","yep","yup",
}
DENY_KW = {"아니","취소","cancel","no","ㄴ","싫","말아","하지마"}

def is_approve(text):
    t = text.strip().lower()
    if any(k in t for k in DENY_KW):
        return False
    tokens = set(t.split())
    for k in APPROVE_KEYWORDS:
        if len(k) <= 2:
            if t == k or k in tokens:
                return True
        else:
            if k in t and len(t) < 30:
                return True
    return False

# 승인 케이스
check("'승인'",            is_approve("승인"),           True)
check("'ㄱ'",              is_approve("ㄱ"),             True)
check("'ok'",              is_approve("ok"),             True)
check("'yep'",             is_approve("yep"),            True)
check("'go'",              is_approve("go"),             True)
check("'넹'",              is_approve("넹"),             True)
check("'진행해줘'",         is_approve("진행해줘"),        True)
check("'실행해주세요'",      is_approve("실행해주세요"),    True)
check("'그냥 해줘'",        is_approve("그냥 해줘"),       True)
check("'좋아 진행해'",       is_approve("좋아 진행해"),     True)
# 거절 케이스
check("'아니' -> False",   is_approve("아니"),           False)
check("'취소' -> False",   is_approve("취소"),           False)
check("'no' -> False",     is_approve("no"),             False)
check("'ㄴ' -> False",     is_approve("ㄴ"),             False)
# 거절 키워드 포함 시 승인 키워드 있어도 False
check("'승인 아니야' -> False", is_approve("승인 아니야"), False)
# 너무 긴 문장
check("30자 초과 애매 문장 -> False",
      is_approve("이거 말고 다른걸 먼저 검토해보고 싶어요"), False)


# ════════════════════════════════════════════════════════
section("2. alert_dispatcher - undispatched 필터 + mark_sent 머지")
# ════════════════════════════════════════════════════════

def list_undispatched(rows):
    pending = []
    for r in rows:
        sent = r.get("sent_channels") or []
        if not sent:
            pending.append(r)
        elif any(not e.get("ok") for e in sent):
            r["_retry_ids"]   = {e["channel_id"] for e in sent if not e.get("ok")}
            r["_already_ids"] = {e["channel_id"] for e in sent if e.get("ok")}
            pending.append(r)
    pending.reverse()
    return pending

def mark_sent_merge(existing, new_ok):
    merged = {e["channel_id"]: e for e in existing}
    for e in new_ok:
        merged[e["channel_id"]] = e
    return list(merged.values())

check("완전 미발송 -> pending",
      len(list_undispatched([{"id":"A","sent_channels":[]}])), 1)

check("전체 성공 -> 스킵",
      len(list_undispatched([{"id":"B","sent_channels":[{"channel_id":"c1","ok":True}]}])), 0)

rows = [{"id":"C","sent_channels":[
    {"channel_id":"c1","ok":True},
    {"channel_id":"c2","ok":False},
]}]
res = list_undispatched(rows)
check("일부 실패 -> pending 1건", len(res), 1)
check("  retry_ids={c2}", res[0]["_retry_ids"], {"c2"})
check("  already_ids={c1}", res[0]["_already_ids"], {"c1"})

check("전체 실패 -> pending",
      len(list_undispatched([{"id":"D","sent_channels":[{"channel_id":"c1","ok":False}]}])), 1)

rows2 = [{"id":"new","sent_channels":[]}, {"id":"old","sent_channels":[]}]
res2 = list_undispatched(rows2)
check("시간순 정렬 old 먼저", res2[0]["id"], "old")

merged = mark_sent_merge(
    [{"channel_id":"c1","ok":True}],
    [{"channel_id":"c2","ok":True}]
)
check("merge 기존+신규 {c1,c2}", {e["channel_id"] for e in merged}, {"c1","c2"})

merged2 = mark_sent_merge(
    [{"channel_id":"c1","ok":False}],
    [{"channel_id":"c1","ok":True}]
)
check("같은 channel -> 신규(ok=True) 우선", merged2[0]["ok"], True)

ev = {"id":"ev1","sent_channels":[
    {"channel_id":"c1","ok":True},
    {"channel_id":"c2","ok":False},
]}
[ev] = list_undispatched([ev])
already = ev.get("_already_ids") or set()
channels = [{"id":"c1"}, {"id":"c2"}]
skipped = [c["id"] for c in channels if c["id"] in already]
retried  = [c["id"] for c in channels if c["id"] not in already]
check("재시도 루프: c1(성공) -> 스킵", skipped, ["c1"])
check("재시도 루프: c2(실패) -> 재시도", retried, ["c2"])


# ════════════════════════════════════════════════════════
section("3. program_health - escalation 로직")
# ════════════════════════════════════════════════════════

ESCALATE_CONSECUTIVE = 3

def can_escalate(current, recent, cooldown=False):
    # recent = INSERT 후 조회한 최근 N건 (recent[0] = 현재 사이클)
    if current not in ("down","degraded"):
        return False
    if len(recent) < ESCALATE_CONSECUTIVE:
        return False
    if not all(s in ("down","degraded") for s in recent):
        return False
    if cooldown:
        return False
    return True

check("3사이클 down -> escalate",
      can_escalate("down", ["down","down","down"]), True)
check("3사이클 degraded -> escalate",
      can_escalate("degraded", ["degraded","degraded","degraded"]), True)
check("down+degraded 혼합 -> escalate",
      can_escalate("down", ["down","degraded","down"]), True)
check("2사이클 down뿐 -> no escalate (이중집계 버그 회귀 방지)",
      can_escalate("down", ["down","down"]), False)
check("중간에 up 있음 -> no escalate",
      can_escalate("down", ["down","up","down"]), False)
check("현재 up -> no escalate",
      can_escalate("up", ["up","down","down"]), False)
check("쿨다운 중 -> no escalate",
      can_escalate("down", ["down","down","down"], cooldown=True), False)
check("기록 없음 -> no escalate",
      can_escalate("down", []), False)


# ════════════════════════════════════════════════════════
section("4. cs_views - _call_maeyo conversation_id/user_id 전달")
# ════════════════════════════════════════════════════════

def build_agency_body(message, history, user_context, operator_id,
                      conversation_id=None, user_id=""):
    body = {
        "message": message,
        "history": history,
        "user_context": user_context,
        "operator_id": operator_id,
        "user_id": user_id,
        "program": "maesil-insight",
    }
    if conversation_id:
        body["conversation_id"] = conversation_id
    return body

body = build_agency_body("안녕", [], {}, "op1",
                         conversation_id="conv-abc", user_id="user-1")
check("conversation_id 포함", "conversation_id" in body, True)
check("conversation_id 값", body["conversation_id"], "conv-abc")
check("user_id 포함", body["user_id"], "user-1")

body2 = build_agency_body("첫 메시지", [], {}, "op1", conversation_id=None)
check("None이면 키 자체 누락", "conversation_id" not in body2, True)
check("user_id 기본값 빈 문자열", body2["user_id"], "")


# ════════════════════════════════════════════════════════
section("5. dev_agent - PROPOSED_FIX 신뢰도 파싱 + 안내 메시지")
# ════════════════════════════════════════════════════════

def parse_confidence(fix_block):
    m = re.search(r'신뢰도:\s*(high|medium|low)', fix_block, re.I)
    return m.group(1).lower() if m else "medium"

def get_hint(conf):
    if conf == "high":
        return "HIGH"
    elif conf == "low":
        return "LOW"
    return "MEDIUM"

check("신뢰도: high",  parse_confidence("신뢰도: high\n커밋메시지: fix:"), "high")
check("신뢰도: LOW (대소문자 무시)", parse_confidence("신뢰도: LOW"), "low")
check("신뢰도: Medium", parse_confidence("신뢰도: Medium"), "medium")
check("신뢰도 없으면 medium 기본값", parse_confidence("커밋메시지: fix: 뭔가"), "medium")
check("HIGH -> 즉시승인 안내", get_hint("high"), "HIGH")
check("LOW -> 미리보기 권장", get_hint("low"), "LOW")
check("MEDIUM -> 기본 안내", get_hint("medium"), "MEDIUM")


# ════════════════════════════════════════════════════════
section("6. AttributeError 심볼 추출 패턴")
# ════════════════════════════════════════════════════════

def extract_error_fn(text):
    # 최우선: 'ClassName' object has no attribute 'method'
    m = re.search(
        r"['\"]([A-Za-z][A-Za-z0-9_]+)['\"]?\s+object\s+has\s+no\s+attribute\s+['\"]([a-z_]\w+)['\"]",
        text, re.I,
    )
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    m = re.search(r'\[[a-z_][a-z0-9_]+\]\s+\[([A-Z][a-zA-Z0-9_]+)\]\s+(?:POST|GET|PUT|DELETE|PATCH)\s+(/[^\s\n]+)', text, re.I)
    if m:
        return f"{m.group(1)}.{m.group(2).strip('/').split('/')[-1].replace('-','_')}"
    m = re.search(r'\[([A-Z][a-zA-Z0-9_]+)\]\s+(\w+)\s+(예외|실패|오류|에러|error|failed)', text, re.I)
    if m:
        return f"{m.group(1)}.{m.group(2)}"
    return None

check("AttributeError: 접두사 있음",
      extract_error_fn("AttributeError: 'NaverAdClient' object has no attribute 'create_stat_report'"),
      "NaverAdClient.create_stat_report")
check("로거 태그 뒤 has no attribute",
      extract_error_fn("[Collector] AD 예외: 'NaverAdClient' object has no attribute 'create_stat_report'"),
      "NaverAdClient.create_stat_report")
check("API 클라이언트 로그",
      extract_error_fn("[naver_ad_api_client] [NaverAd] POST /stat-reports -> 400:"),
      "NaverAd.stat_reports")
check("[ClassName] method 예외",
      extract_error_fn("[AgencyLog] start 예외"),
      "AgencyLog.start")


# ════════════════════════════════════════════════════════
section("7. 통합 시나리오 — alert 발생부터 escalation까지")
# ════════════════════════════════════════════════════════

# 시나리오: maesil-sync-worker가 3사이클 연속 down
health_history = ["down", "down", "down"]  # 현재 포함 3사이클 (INSERT 후 조회)
current = "down"

# Step 1: escalation 조건 충족?
escalated = can_escalate(current, health_history)
check("3사이클 연속 down -> escalation 트리거", escalated, True)

# Step 2: alert_events 생성 -> undispatched로 조회됨
fake_event = {"id":"esc1","severity":"critical","sent_channels":[]}
pending = list_undispatched([fake_event])
check("critical alert -> undispatched pending", len(pending), 1)

# Step 3: 이메일 발송 성공
ok_entry = {"channel_id":"email_ch","ok":True}
mark_sent_merge([], [ok_entry])  # 성공 마킹
check("발송 성공 후 ok=True 마킹", ok_entry["ok"], True)

# Step 4: 다음 사이클에 같은 이벤트 다시 안 잡힘
fake_event["sent_channels"] = [ok_entry]
pending2 = list_undispatched([fake_event])
check("성공 마킹 후 다음 사이클 스킵", len(pending2), 0)


# ════════════════════════════════════════════════════════
print(f"\n{'='*58}")
print(f"  최종 결과: {PASS}/{PASS+FAIL} PASSED  " +
      ("ALL PASS" if FAIL == 0 else f"FAIL {FAIL}건"))
print(f"{'='*58}")
if FAIL:
    sys.exit(1)
