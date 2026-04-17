-- ============================================================
-- Migration: Add receipt_no to wo_receipt_lines
-- ============================================================
ALTER TABLE wo_receipt_lines
  ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(20);
