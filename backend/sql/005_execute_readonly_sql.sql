-- maesil-agency / Phase 2
-- execute_readonly_sql RPC 함수 생성
-- autotool DB와 maesil-insight DB 양쪽에 실행 필요

CREATE OR REPLACE FUNCTION public.execute_readonly_sql(query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    trimmed text;
BEGIN
    trimmed := trim(upper(query));
    -- SELECT만 허용
    IF NOT (trimmed LIKE 'SELECT%' OR trimmed LIKE 'WITH%') THEN
        RAISE EXCEPTION 'Only SELECT/WITH queries are allowed. Got: %', left(trimmed, 50);
    END IF;

    EXECUTE format(
        'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (%s) t',
        query
    ) INTO result;

    RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- service_role에 실행 권한 부여
GRANT EXECUTE ON FUNCTION public.execute_readonly_sql(text) TO service_role;
