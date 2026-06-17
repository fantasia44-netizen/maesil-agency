-- ⚠️  이 SQL은 maesil-INSIGHT Supabase에서 실행 (public 스키마)
--      maesil-total이 아님

-- 생산 실적 (제조/입고 기록)
CREATE TABLE IF NOT EXISTS public.production_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id     TEXT NOT NULL,
    production_date DATE NOT NULL,
    product_name    TEXT NOT NULL,
    sku             TEXT,
    planned_qty     INTEGER NOT NULL DEFAULT 0,   -- 계획 생산량
    actual_qty      INTEGER NOT NULL DEFAULT 0,   -- 실제 생산량
    unit_cost       NUMERIC(12,2),                -- 단위 생산단가
    status          TEXT NOT NULL DEFAULT 'completed',
                    -- planned | in_progress | completed | cancelled
    factory         TEXT,                         -- 공장/업체명
    lot_number      TEXT,                         -- LOT 번호
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS production_logs_operator_date
    ON public.production_logs (operator_id, production_date DESC);
CREATE INDEX IF NOT EXISTS production_logs_sku
    ON public.production_logs (operator_id, sku);

-- 출고 실적 (채널/주문별 출고)
CREATE TABLE IF NOT EXISTS public.shipment_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id     TEXT NOT NULL,
    shipment_date   DATE NOT NULL,
    product_name    TEXT NOT NULL,
    sku             TEXT,
    channel         TEXT NOT NULL,               -- coupang | smartstore | wholesale | direct 등
    qty             INTEGER NOT NULL DEFAULT 0,  -- 출고 수량
    unit_price      NUMERIC(12,2),               -- 출고 단가
    order_ref       TEXT,                        -- 주문번호/묶음배송번호
    status          TEXT NOT NULL DEFAULT 'shipped',
                    -- pending | shipped | delivered | returned | cancelled
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shipment_logs_operator_date
    ON public.shipment_logs (operator_id, shipment_date DESC);
CREATE INDEX IF NOT EXISTS shipment_logs_sku
    ON public.shipment_logs (operator_id, sku, shipment_date DESC);

-- 재고 이동 VIEW (생산 입고 - 출고 = 재고 변동)
CREATE OR REPLACE VIEW public.inventory_movement AS
SELECT
    operator_id,
    sku,
    product_name,
    production_date AS date,
    'production'    AS movement_type,
    actual_qty      AS qty_in,
    0               AS qty_out,
    factory         AS reference
FROM public.production_logs
WHERE status = 'completed'

UNION ALL

SELECT
    operator_id,
    sku,
    product_name,
    shipment_date   AS date,
    'shipment'      AS movement_type,
    0               AS qty_in,
    qty             AS qty_out,
    channel         AS reference
FROM public.shipment_logs
WHERE status IN ('shipped', 'delivered');
