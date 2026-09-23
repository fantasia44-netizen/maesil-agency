"""test_render_logs_classify.py — Render 로그 → severity 분류 회귀 검증.

배경(2026-09-21): 아래 줄들이 ERROR 이메일로 발송됨
  - 접근로그 404: GET /wp-includes/Requests/src/Exception/177.php  (경로의 'Exception' 매칭)
  - sync_worker [WARNING] ... The read operation timed out       ('timeout' 매칭)
규칙: 접근로그 404 는 제외, 로그가 밝힌 레벨(WARNING/INFO) 위로 키워드 승격 금지.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("MAESIL_TOTAL_SUPABASE_URL", "http://sim.local")
os.environ.setdefault("MAESIL_TOTAL_SERVICE_ROLE_KEY", "sim-key")

from app.services.render_logs import classify  # noqa: E402

CASES = [
    # (message, expected)
    ('10.197.128.100 - - [19/Sep/2026:22:28:51 +0000] "GET /wp-includes/Requests/src/Exception/177.php HTTP/1.1" 404 938 "-" "Go-http-client/2.0"', None),
    ('10.195.135.228 - - [19/Sep/2026:22:28:32 +0000] "GET /wp-content/uploads/error.php HTTP/1.1" 404 938 "-" "Go-http-client/2.0"', None),
    ('2026-09-21 20:46:51,935 [WARNING] sync_worker: [Worker sync-w1] claim_sync_job 일시 오류 → 스킵(다음 루프 재시도): ReadTimeout: The read operation timed out', None),
    ('2026-09-21 21:32:08,678 [WARNING] sync_worker: [Leader] try_acquire 실패 (RPC 미존재 가능): The read operation timed out', 'warning'),
    ('2026-09-21 21:32:08,678 [WARNING] sync_worker: [Leader] heartbeat RPC 실패 (낙관적 유지): timeout', None),
    ('{"ts": "2026-09-17T16:16:23+09:00", "level": "WARNING", "module": "ext_auth", "msg": "[ExtAuth] 토큰 만료 — Exception"}', 'warning'),
    ('{"ts": "2026-09-21T04:15:00+09:00", "level": "INFO", "module": "scheduler", "msg": "[storage_cleanup] 완료 — errors=0 timeout"}', None),
    ('2026-09-21 10:13:10,399 [INFO] httpx: HTTP Request: POST https://x.supabase.co/rest/v1/rpc/claim_sync_job "HTTP/1.1 200 OK"', None),
    # Render 배포 로그 — 단독 ESC 가 섞여도 제외 (2026-09-22 오알림)
    ("==>\u001b Running 'gunicorn \"app:create_app()\" --workers 2 --threads 4 --timeout 600", None),
    ("\u001b[36m==>\u001b[0m Running 'gunicorn \"app:create_app()\" --workers 2'", None),
    ("\u001b Build successful \u001b", None),
    ("==> Deploying...", None),
    # 일시 장애로 스스로 복구되는 인증 타임아웃 — WARNING 으로 내려 알림 제외
    ('{"level": "WARNING", "module": "app", "msg": "[AUTH] user_loader 일시 오류: Read timed out"}', None),
    # 진짜 에러는 그대로
    ('[2026-09-21 09:49:55,609] ERROR in orders: [로켓수동입력 재고차감 실패-저장중단] 2026-09-21 | 해서', 'error'),
    ('Traceback (most recent call last):\n  File "app.py", line 1\nValueError: boom', 'error'),
    ('2026-09-21 10:00:00 [ERROR] worker: The read operation timed out', 'error'),
    ('10.1.1.1 - - [21/Sep/2026:10:00:00 +0000] "GET /app/revenue HTTP/1.1" 500 120 "-" "Mozilla"', 'critical'),
    ('{"level": "INFO", "msg": "GET /x HTTP/1.1\\" 502"} 10.1.1.1 "GET /x HTTP/1.1" 502 0', 'critical'),
    ('2026-09-21 [CRITICAL] app: out of memory', 'critical'),
]


def run():
    failed = 0
    for msg, expected in CASES:
        got = classify(msg)
        ok = got == expected
        failed += (not ok)
        print(f"  {'PASS' if ok else 'FAIL'}  expected={expected!s:9} got={got!s:9}  {msg[:70]!r}")
    print(f"\n{len(CASES) - failed}/{len(CASES)} passed")
    return failed == 0


if __name__ == "__main__":
    sys.exit(0 if run() else 1)
