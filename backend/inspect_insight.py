"""
maesil-insight DB 스키마 탐색 스크립트.
실행: cd backend && python inspect_insight.py
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))

# 환경변수 로드
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

from app.db.registry_client import get_db_client

client = get_db_client("maesil-insight")

# 1) public 스키마 테이블 목록
print("\n=== maesil-insight public 테이블 목록 ===")
result = client.rpc("execute_readonly_sql", {
    "query": """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
    """
}).execute()
for row in (result.data or []):
    print(" -", row.get("table_name") or row)

# 2) operator/user 관련 테이블 컬럼 탐색
TARGETS = ["operators", "users", "operator", "user", "accounts", "members", "companies"]

print("\n=== operator/user 관련 테이블 컬럼 ===")
for tname in TARGETS:
    try:
        r = client.rpc("execute_readonly_sql", {
            "query": f"""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = '{tname}'
                ORDER BY ordinal_position
            """
        }).execute()
        if r.data:
            print(f"\n[{tname}]")
            for col in r.data:
                print(f"  {col.get('column_name')} ({col.get('data_type')})")
    except Exception as e:
        pass

# 3) 샘플 operator row 1건 (비밀번호 제외)
print("\n=== operators 샘플 (있을 경우) ===")
try:
    r = client.rpc("execute_readonly_sql", {
        "query": """
            SELECT *
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name IN (
                SELECT table_name FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name ILIKE '%operat%'
              )
            ORDER BY table_name, ordinal_position
        """
    }).execute()
    for row in (r.data or []):
        print(f"  {row.get('table_name')}.{row.get('column_name')} ({row.get('data_type')})")
except Exception as e:
    print("오류:", e)

print("\n완료")
