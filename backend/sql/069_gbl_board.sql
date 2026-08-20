-- 069_gbl_board.sql — GBL Note 회원 전용 게시판 (잡담방 + 운영자 문의)
-- maesil-hub(public 스키마)에서 실행. 백엔드가 서비스 롤로 insert → RLS 켜도 안전.
-- board: 'chat'(잡담방) | 'inquiry'(운영자 문의)

CREATE TABLE IF NOT EXISTS public.gbl_posts (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    board       text NOT NULL DEFAULT 'chat',      -- chat | inquiry
    user_id     uuid NOT NULL,                     -- 작성자(users.id)
    title       text NOT NULL,
    body        text NOT NULL,
    answered    boolean NOT NULL DEFAULT false,    -- inquiry: 운영자 답변 완료 여부
    reply_count integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbl_posts_board ON public.gbl_posts (board, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gbl_posts_user  ON public.gbl_posts (user_id);

CREATE TABLE IF NOT EXISTS public.gbl_post_replies (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    post_id    bigint NOT NULL REFERENCES public.gbl_posts(id) ON DELETE CASCADE,
    user_id    uuid NOT NULL,
    is_admin   boolean NOT NULL DEFAULT false,     -- 운영자(super_admin) 답변 표시
    body       text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gbl_replies_post ON public.gbl_post_replies (post_id, created_at);

ALTER TABLE public.gbl_posts        ENABLE ROW LEVEL SECURITY;  -- 서비스 롤만(외부 차단)
ALTER TABLE public.gbl_post_replies ENABLE ROW LEVEL SECURITY;
