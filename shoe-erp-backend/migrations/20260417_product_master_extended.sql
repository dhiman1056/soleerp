-- ============================================================
-- Migration: Extended Product Master fields
-- ============================================================

ALTER TABLE product_master
  ADD COLUMN IF NOT EXISTS design_no         VARCHAR(50),
  ADD COLUMN IF NOT EXISTS category          VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sub_category      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS size_chart        VARCHAR(50),
  ADD COLUMN IF NOT EXISTS color             VARCHAR(50),
  ADD COLUMN IF NOT EXISTS hsn_code          VARCHAR(20),
  ADD COLUMN IF NOT EXISTS gst_rate          NUMERIC(5,2)  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS basic_cost_price  NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_price        NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS mrp               NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sp                NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS supplier_name     VARCHAR(150),
  ADD COLUMN IF NOT EXISTS brand_name        VARCHAR(100),
  ADD COLUMN IF NOT EXISTS pack_size         INTEGER       DEFAULT 1,
  ADD COLUMN IF NOT EXISTS images            JSONB         DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN       DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP     DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMP     DEFAULT NOW();
