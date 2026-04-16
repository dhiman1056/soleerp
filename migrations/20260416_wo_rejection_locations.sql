-- ============================================================
-- Migration: WO Rejection + Location tracking
-- ============================================================

-- 1. Add new SF-WIP and FG-WIP locations
INSERT INTO location_master (location_code, location_name, location_type) VALUES
  ('LOC-SF-WIP-001', 'SF-WIP Store', 'WIP'),
  ('LOC-FG-WIP-001', 'FG-WIP Store', 'WIP')
ON CONFLICT DO NOTHING;

-- 2. Add rejection_qty, from/to location columns to wo_receipt_lines
ALTER TABLE wo_receipt_lines
  ADD COLUMN IF NOT EXISTS rejection_qty     NUMERIC(12,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS from_location_id  INTEGER REFERENCES location_master(id),
  ADD COLUMN IF NOT EXISTS to_location_id    INTEGER REFERENCES location_master(id);

-- 3. Add location tracking columns to stock_ledger
ALTER TABLE stock_ledger
  ADD COLUMN IF NOT EXISTS location_id   INTEGER REFERENCES location_master(id),
  ADD COLUMN IF NOT EXISTS location_name VARCHAR(100);
