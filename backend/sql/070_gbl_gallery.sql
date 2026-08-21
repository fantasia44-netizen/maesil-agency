-- 070_gbl_gallery.sql
-- GBL Note 자랑 갤러리 게시판. 유저가 100%·레전드·전적 등 이미지를 올려 공유.
-- maesil-hub(public 스키마)에서 실행. 이미지는 Supabase Storage 'gbl-gallery' 버킷(백엔드가 자동 생성).

CREATE TABLE IF NOT EXISTS public.gbl_gallery (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL,
    display_name text,
    image_path   text NOT NULL,   -- gbl-gallery 버킷 내 경로
    caption      text,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbl_gallery_recent ON public.gbl_gallery (created_at DESC);

ALTER TABLE public.gbl_gallery ENABLE ROW LEVEL SECURITY;  -- 서비스 롤만(백엔드 경유)

-- ※ Storage 버킷 'gbl-gallery'(public)는 백엔드가 첫 업로드 시 자동 생성.
--   수동 생성 시: Supabase → Storage → New bucket → 'gbl-gallery', Public 체크.
