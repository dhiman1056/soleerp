-- =============================================================================
-- PART A — SUPPLIER MANAGEMENT & PURCHASING
-- =============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  supplier_code VARCHAR(20) UNIQUE NOT NULL,  -- auto: SUP-001
  supplier_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  pincode VARCHAR(10),
  gstin VARCHAR(20),
  payment_terms VARCHAR(100),   -- e.g. "30 days net", "Advance"
  credit_limit DECIMAL(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Note: We will generate supplier_code in JS controller, but you could also do it via sequence like we did for WOs.
-- Using sequence for supplier codes:
CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_no VARCHAR(20) UNIQUE NOT NULL,     -- auto: PO-001
  po_date DATE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_name VARCHAR(150),
  expected_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  -- DRAFT / SENT / PARTIAL_RECEIVED / RECEIVED / CANCELLED
  total_value DECIMAL(14,2) DEFAULT 0,
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS po_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS po_lines (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id),
  line_no INTEGER NOT NULL,
  sku_code VARCHAR(50) NOT NULL,
  sku_description VARCHAR(255),
  uom VARCHAR(20),
  ordered_qty DECIMAL(12,3) NOT NULL,
  received_qty DECIMAL(12,3) DEFAULT 0,
  pending_qty DECIMAL(12,3),             -- computed: ordered - received
  rate DECIMAL(12,2) NOT NULL,
  line_value DECIMAL(14,2),              -- ordered_qty * rate
  UNIQUE(po_id, line_no)
);

CREATE TABLE IF NOT EXISTS po_receipts (
  id SERIAL PRIMARY KEY,
  grn_no VARCHAR(20) UNIQUE NOT NULL,   -- auto: GRN-001 (Goods Receipt Note)
  grn_date DATE NOT NULL,
  po_id INTEGER REFERENCES purchase_orders(id),
  po_no VARCHAR(20),
  supplier_id INTEGER REFERENCES suppliers(id),
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS grn_seq START 1 INCREMENT 1;

CREATE TABLE IF NOT EXISTS po_receipt_lines (
  id SERIAL PRIMARY KEY,
  grn_id INTEGER REFERENCES po_receipts(id),
  po_line_id INTEGER REFERENCES po_lines(id),
  sku_code VARCHAR(50),
  received_qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2),
  value DECIMAL(14,2)
);

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  transaction_type VARCHAR(30),
  -- PURCHASE / PAYMENT / DEBIT_NOTE / CREDIT_NOTE
  reference_no VARCHAR(50),
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  running_balance DECIMAL(14,2),  -- positive = payable to supplier
  remarks VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);


-- =============================================================================
-- PART B — SETTINGS MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_group VARCHAR(50),
  -- COMPANY / FINANCIAL / INVENTORY / NOTIFICATION
  label VARCHAR(100),
  input_type VARCHAR(20) DEFAULT 'text',
  -- text / number / boolean / select / textarea
  options TEXT,  -- JSON array for select type
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);

TRUNCATE TABLE company_settings RESTART IDENTITY CASCADE;

INSERT INTO company_settings (setting_key, setting_value, setting_group, label, input_type) VALUES
('company_name','ShoeERP Manufacturing','COMPANY','Company Name','text'),
('company_address','','COMPANY','Address','textarea'),
('company_city','','COMPANY','City','text'),
('company_state','','COMPANY','State','text'),
('company_pincode','','COMPANY','Pincode','text'),
('company_phone','','COMPANY','Phone','text'),
('company_email','','COMPANY','Email','text'),
('company_gstin','','COMPANY','GSTIN','text'),
('company_logo_url','','COMPANY','Logo URL','text'),
('financial_year_start','2025-04-01','FINANCIAL','FY Start Date','text'),
('financial_year_end','2026-03-31','FINANCIAL','FY End Date','text'),
('currency_symbol','₹','FINANCIAL','Currency Symbol','text'),
('default_uom','Pair','FINANCIAL','Default UOM','text'),
('low_stock_alert_enabled','true','INVENTORY','Enable Low Stock Alerts','boolean'),
('auto_stock_deduction','true','INVENTORY','Auto Deduct Stock on WO Issue','boolean'),
('allow_negative_stock','false','INVENTORY','Allow Negative Stock','boolean'),
('default_reorder_level','50','INVENTORY','Default Reorder Level','number'),
('notify_low_stock','true','NOTIFICATION','Notify on Low Stock','boolean'),
('notify_pending_wo','true','NOTIFICATION','Notify on Pending WO (>7 days)','boolean'),
('notify_po_due','true','NOTIFICATION','Notify on PO Delivery Due','boolean'),
('low_stock_notify_roles','admin,manager','NOTIFICATION','Low Stock Notify Roles','text');


-- User Modifications
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_notes TEXT;


-- =============================================================================
-- PART C — NOTIFICATIONS SYSTEM
-- =============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(50) NOT NULL,
  -- LOW_STOCK / PENDING_WO / PO_DUE / SYSTEM
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(30),   -- WORK_ORDER / STOCK / PURCHASE_ORDER
  reference_id VARCHAR(50),     -- WO ID / SKU / PO ID
  severity VARCHAR(10) DEFAULT 'INFO',
  -- INFO / WARNING / CRITICAL
  is_read BOOLEAN DEFAULT FALSE,
  target_roles TEXT DEFAULT 'admin,manager',
  created_at TIMESTAMP DEFAULT NOW()
);
