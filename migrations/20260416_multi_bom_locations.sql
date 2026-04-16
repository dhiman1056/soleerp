-- ============================================================
-- Migration: Multi-BOM Work Orders + Location Master
-- Run on Railway Postgres via psql or Railway shell
-- ============================================================

-- 1. Location Master table
CREATE TABLE IF NOT EXISTS location_master (
  id            SERIAL PRIMARY KEY,
  location_code VARCHAR(30)  UNIQUE NOT NULL,
  location_name VARCHAR(100) NOT NULL,
  location_type VARCHAR(30)  NOT NULL
    CHECK (location_type IN ('RAW_MATERIAL','SEMI_FINISHED','FINISHED_GOODS','WIP','OTHER')),
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Default locations (idempotent)
INSERT INTO location_master (location_code, location_name, location_type) VALUES
  ('LOC-RM-001',       'Raw Material Store',          'RAW_MATERIAL'),
  ('LOC-SF-001',       'Semi-Finished Store',          'SEMI_FINISHED'),
  ('LOC-FG-001',       'Finished Goods Warehouse',     'FINISHED_GOODS'),
  ('LOC-WIP-001',      'WIP Store',                    'WIP'),
  ('LOC-STITCH-001',   'Stitching & Cutting Floor',    'WIP'),
  ('LOC-ASSEMBLY-001', 'Assembly Floor',               'WIP')
ON CONFLICT (location_code) DO NOTHING;

-- 2. work_order_bom_lines (multi-BOM per WO)
CREATE TABLE IF NOT EXISTS work_order_bom_lines (
  id           SERIAL PRIMARY KEY,
  wo_id        INTEGER NOT NULL REFERENCES work_order_header(id) ON DELETE CASCADE,
  bom_id       INTEGER NOT NULL REFERENCES bom_header(id),
  planned_qty  NUMERIC(12,4) NOT NULL,
  received_qty NUMERIC(12,4) DEFAULT 0,
  bom_code     VARCHAR(20),
  output_sku   VARCHAR(50),
  status       VARCHAR(20)   DEFAULT 'PENDING',
  created_at   TIMESTAMP     DEFAULT NOW()
);

-- Index for fast lookups by WO
CREATE INDEX IF NOT EXISTS idx_wo_bom_lines_wo_id ON work_order_bom_lines(wo_id);

-- 3. Alter work_order_header: make bom_id optional, add location FK columns
ALTER TABLE work_order_header
  ALTER COLUMN bom_id DROP NOT NULL;

ALTER TABLE work_order_header
  ADD COLUMN IF NOT EXISTS from_location_id INTEGER REFERENCES location_master(id),
  ADD COLUMN IF NOT EXISTS to_location_id   INTEGER REFERENCES location_master(id);

-- 4. Back-fill work_order_bom_lines from existing WOs (optional, idempotent)
-- Inserts a bom_line row for every existing WO that has a bom_id but no bom_lines yet
INSERT INTO work_order_bom_lines (wo_id, bom_id, planned_qty, received_qty, bom_code, output_sku)
SELECT
  w.id,
  w.bom_id,
  w.planned_qty,
  w.received_qty,
  b.bom_code,
  b.output_sku
FROM work_order_header w
JOIN bom_header b ON w.bom_id = b.id
WHERE w.bom_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM work_order_bom_lines wbl WHERE wbl.wo_id = w.id
  );
