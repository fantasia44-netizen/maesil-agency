-- 012_repo_files.sql
-- 등록된 GitHub 레포의 소스 파일을 미러링 (dev-agent 검색용 — GitHub API 호출 최소화)
--
-- 동기화: app.services.repo_mirror.sync_all_active() — 5분 폴 사이클
-- 검색:   agent_work.find_file_with_symbol(repo, symbol, basenames)

-- ─────────────────────────────────────────────────────────────────
-- 1) 파일 본문 미러
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_work.repo_files (
    repo         text  NOT NULL,                   -- fantasia44-netizen/maesil-insight
    path         text  NOT NULL,                   -- app/services/repository.py
    sha          text  NOT NULL,                   -- blob sha (변경 감지용)
    content      text  NOT NULL,
    size_bytes   int   NOT NULL DEFAULT 0,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (repo, path)
);

CREATE INDEX IF NOT EXISTS repo_files_repo_idx ON agent_work.repo_files (repo);

-- 부분문자열 검색 인덱스 (선택 — pg_trgm 사용 가능시 활성화)
-- pg_trgm이 없으면 그냥 ILIKE/regex full scan 으로 동작 (5MB 수준에선 무관)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS repo_files_content_trgm_idx
    ON agent_work.repo_files USING gin (content gin_trgm_ops);

-- ─────────────────────────────────────────────────────────────────
-- 2) 동기화 상태
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_work.repo_sync_state (
    repo            text PRIMARY KEY,
    branch          text NOT NULL DEFAULT 'main',
    commit_sha      text,
    file_count      int  NOT NULL DEFAULT 0,
    last_synced_at  timestamptz,
    last_error      text
);

-- ─────────────────────────────────────────────────────────────────
-- 3) 검색 함수 (RPC)
-- ─────────────────────────────────────────────────────────────────
-- dev-agent 의 3차 탐색 대체. 우선순위:
--   0 = 추출된 basename 후보와 일치 (예: repository.py)
--   1 = 'class XXX' 또는 'def XXX' 정의 존재
--   2 = 본문에 심볼 문자열 포함 (대소문자 무시)
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
    WITH scored AS (
        SELECT
            f.path,
            f.content,
            f.sha,
            CASE
                WHEN array_length(p_basenames, 1) IS NOT NULL
                     AND split_part(f.path, '/', array_length(string_to_array(f.path, '/'), 1)) = ANY(p_basenames)
                    THEN 0
                WHEN f.content ~ ('(class|def)\s+' || p_symbol || '\b')
                    THEN 1
                WHEN f.content ILIKE '%' || p_symbol || '%'
                    THEN 2
                ELSE 99
            END AS score
        FROM agent_work.repo_files f
        WHERE f.repo = p_repo
          AND (
              (array_length(p_basenames, 1) IS NOT NULL
               AND split_part(f.path, '/', array_length(string_to_array(f.path, '/'), 1)) = ANY(p_basenames))
              OR f.content ~ ('(class|def)\s+' || p_symbol || '\b')
              OR f.content ILIKE '%' || p_symbol || '%'
          )
    )
    SELECT path, content, sha, score
    FROM scored
    WHERE score < 99
    ORDER BY score, length(content)
    LIMIT 5;
$$;

GRANT EXECUTE ON FUNCTION agent_work.find_file_with_symbol(text, text, text[]) TO service_role;
