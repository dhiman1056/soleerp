-- ============================================================
-- Migration: Purchase Returns + Opening Stock Support
-- ============================================================

-- 1. Purchase Returns header
CREATE TABLE IF NOT EXISTS purchase_returns (
  id            SERIAL PRIMARY KEY,
  prn_no        VARCHAR(20) UNIQUE NOT NULL,
  prn_date      DATE NOT NULL,
  grn_no        VARCHAR(20),
  supplier_id   INTEGER REFERENCES suppliers(id),
  supplier_name VARCHAR(150),
  total_value   NUMERIC(14,2) DEFAULT 0,
  remarks       TEXT,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- 2. Purchase Return lines
CREATE TABLE IF NOT EXISTS purchase_return_lines (
  id              SERIAL PRIMARY KEY,
  prn_id          INTEGER REFERENCES purchase_returns(id) ON DELETE CASCADE,
  sku_code        VARCHAR(50),
  sku_description VARCHAR(255),
  uom             VARCHAR(20),
  return_qty      NUMERIC(12,3) NOT NULL,
  rate            NUMERIC(12,2),
  value           NUMERIC(14,2),
  reason          TEXT
);

-- 3. Add grn_no & challan_no to po_receipts if not present
ALTER TABLE po_receipts
  ADD COLUMN IF NOT EXISTS grn_no     VARCHAR(20),
  ADD COLUMN IF NOT EXISTS challan_no VARCHAR(50),
  ADD COLUMN IF NOT EXISTS grn_date   DATE;

-- 4. Add reference_type column to stock_ledger if missing
ALTER TABLE stock_ledger
  ADD COLUMN IF NOT EXISTS reference_type VARCHAR(30);
