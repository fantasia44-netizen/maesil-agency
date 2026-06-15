-- maesil-agency / 보안 보강
-- execute_readonly_sql RPC 강화 — 005_execute_readonly_sql.sql 대체본.
--
-- 적용 대상: maesil-total(autotool, agent_work 스키마) + maesil-insight(public) 양쪽.
--   * maesil-total 은 agent_work 스키마에서 호출되므로 agent_work.execute_readonly_sql 도 함께 교체.
--   * maesil-insight 등 외부 DB 는 public.execute_readonly_sql 교체.
--
-- 005 대비 변경점:
--   1) 쓰기 가능 CTE(WITH x AS (DELETE/UPDATE/INSERT ... RETURNING)) 차단
--   2) 세미콜론(다중문) 차단
--   3) SET search_path 고정 → search_path 하이재킹 방지
--   4) 읽기 전용 트랜잭션 + statement_timeout 강제
--   5) 위험 키워드(DML/DDL/함수생성 등) 토큰 단위 차단

CREATE OR REPLACE FUNCTION public.execute_readonly_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    result jsonb;
    trimmed text;
    normalized text;
BEGIN
    IF query IS NULL THEN
        RAISE EXCEPTION 'query is null';
    END IF;

    trimmed := btrim(query);
    -- 끝의 세미콜론 1개는 허용(편의), 그 외 내부 세미콜론은 다중문으로 간주해 차단
    IF right(trimmed, 1) = ';' THEN
        trimmed := btrim(left(trimmed, length(trimmed) - 1));
    END IF;
    IF position(';' IN trimmed) > 0 THEN
        RAISE EXCEPTION 'Multiple statements are not allowed';
    END IF;

    normalized := upper(trimmed);

    -- SELECT 또는 WITH 로만 시작 허용
    IF NOT (normalized LIKE 'SELECT%' OR normalized LIKE 'WITH%') THEN
        RAISE EXCEPTION 'Only SELECT/WITH queries are allowed. Got: %', left(trimmed, 50);
    END IF;

    -- 쓰기 가능 CTE 및 DDL/DML 차단 (단어 경계 정규식 — 컬럼명 오탐 최소화)
    IF normalized ~ '(^|[^A-Z_])(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COPY|VACUUM|REINDEX|REFRESH|CALL|DO|SET|RESET|LOCK)([^A-Z_]|$)' THEN
        RAISE EXCEPTION 'Write/DDL keywords are not allowed in read-only query';
    END IF;

    -- 읽기 전용 + 타임아웃 (이 트랜잭션 한정)
    SET LOCAL transaction_read_only = on;
    SET LOCAL statement_timeout = '15s';

    EXECUTE format(
        'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
        trimmed
    ) INTO result;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text) TO service_role;

-- agent_work 스키마에도 동일 함수가 있으면 같은 본문으로 교체.
-- (maesil-total 클라이언트는 .schema("agent_work").rpc("execute_readonly_sql") 로 호출)
DO $outer$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'agent_work') THEN
        EXECUTE $body$
        CREATE OR REPLACE FUNCTION agent_work.execute_readonly_sql(query text)
        RETURNS jsonb
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = pg_catalog, public, agent_work
        AS $fn$
        DECLARE
            result jsonb;
            trimmed text;
            normalized text;
        BEGIN
            IF query IS NULL THEN
                RAISE EXCEPTION 'query is null';
            END IF;
            trimmed := btrim(query);
            IF right(trimmed, 1) = ';' THEN
                trimmed := btrim(left(trimmed, length(trimmed) - 1));
            END IF;
            IF position(';' IN trimmed) > 0 THEN
                RAISE EXCEPTION 'Multiple statements are not allowed';
            END IF;
            normalized := upper(trimmed);
            IF NOT (normalized LIKE 'SELECT%' OR normalized LIKE 'WITH%') THEN
                RAISE EXCEPTION 'Only SELECT/WITH queries are allowed. Got: %', left(trimmed, 50);
            END IF;
            IF normalized ~ '(^|[^A-Z_])(INSERT|UPDATE|DELETE|MERGE|TRUNCATE|DROP|ALTER|CREATE|GRANT|REVOKE|COPY|VACUUM|REINDEX|REFRESH|CALL|DO|SET|RESET|LOCK)([^A-Z_]|$)' THEN
                RAISE EXCEPTION 'Write/DDL keywords are not allowed in read-only query';
            END IF;
            SET LOCAL transaction_read_only = on;
            SET LOCAL statement_timeout = '15s';
            EXECUTE format(
                'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
                trimmed
            ) INTO result;
            RETURN COALESCE(result, '[]'::jsonb);
        END;
        $fn$;
        $body$;
        EXECUTE 'GRANT EXECUTE ON FUNCTION agent_work.execute_readonly_sql(text) TO service_role';
    END IF;
END
$outer$;
