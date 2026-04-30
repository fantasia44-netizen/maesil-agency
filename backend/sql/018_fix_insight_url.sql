-- 018: maesil_insight_url 시크릿 URL 수정 (maesil-insight.com → onrender.com)
UPDATE agent_work.secrets
SET value = 'https://maesil-insight.onrender.com',
    updated_at = now()
WHERE name = 'maesil_insight_url'
  AND value = 'https://maesil-insight.com';
