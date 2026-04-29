-- 013_repo_files_search_v2.sql
-- find_file_with_symbol 개선:
--   v1: basename 일치만으로도 score 0 → 잘못된 파일 채택 가능
--   v2: 심볼이 본문에 반드시 있어야 (정의 또는 substring), basename은 tie-breaker

CREATE OR REPLACE FUNCTION agent_work.find_file_with_symbol(
    p_repo       text,
    p_symbol     text,
    p_basenames  text[] DEFAULT '{}'::text[]
)
RETURNS TABLE (
    path        text,
    content     text,
    sha         text,
    score       int
)
LANGUAGE sql
STABLE
AS $$
    WITH analyzed AS (
        SELECT
            f.path,
            f.content,
            f.sha,
            -- basename 일치 여부 (힌트)
            CASE
                WHEN array_length(p_basenames, 1) IS NOT NULL
                     AND split_part(f.path, '/',
                         array_length(string_to_array(f.path, '/'), 1)) = ANY(p_basenames)
                THEN true ELSE false
            END AS basename_match,
            -- class/def 정의 존재
            CASE
                WHEN f.content ~ ('(class|def)\s+' || p_symbol || '\b')
                THEN true ELSE false
            END AS def_match,
            -- substring 존재 (대소문자 무시)
            CASE
                WHEN f.content ILIKE '%' || p_symbol || '%'
                THEN true ELSE false
            END AS sub_match
        FROM agent_work.repo_files f
        WHERE f.repo = p_repo
    )
    SELECT
        path,
        content,
        sha,
        CASE
            -- 0: basename 일치 + 정의 존재 (최상)
            WHEN basename_match AND def_match THEN 0
            -- 1: 정의 존재 (basename 무관)
            WHEN def_match THEN 1
            -- 2: basename 일치 + substring (정의는 다른 파일에 있을 수 있음)
            WHEN basename_match AND sub_match THEN 2
            -- 3: substring만 (가장 약한 신호)
            WHEN sub_match THEN 3
            ELSE 99
        END AS score
    FROM analyzed
    -- IMPORTANT: 심볼이 본문에 어떤 형태로든 있어야 (정의 OR substring)
    -- basename 일치만으로는 채택 X (잘못된 파일 거름)
    WHERE def_match OR sub_match
    ORDER BY
        CASE
            WHEN basename_match AND def_match THEN 0
            WHEN def_match THEN 1
            WHEN basename_match AND sub_match THEN 2
            WHEN sub_match THEN 3
            ELSE 99
        END,
        length(content)
    LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION agent_work.find_file_with_symbol(text, text, text[]) TO service_role;
