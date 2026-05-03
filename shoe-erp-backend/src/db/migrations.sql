-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enums
DO $$ BEGIN CREATE TYPE bom_type_enum AS ENUM ('SF','FG','FG_DIRECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE wo_status_enum AS ENUM ('DRAFT', 'ISSUED', 'WIP', 'PARTIAL', 'RECEIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE wo_type_enum AS ENUM ('RM_TO_SF', 'SF_TO_FG', 'RM_TO_FG'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE product_type_enum AS ENUM ('RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Sequences
CREATE SEQUENCE IF NOT EXISTS wo_seq START 1;
CREATE SEQUENCE IF NOT EXISTS supplier_seq START 1;
CREATE SEQUENCE IF NOT EXISTS po_seq START 1;
CREATE SEQUENCE IF NOT EXISTS grn_seq START 1;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_notes TEXT;

-- Masters
CREATE TABLE IF NOT EXISTS uom_master (
  id SERIAL PRIMARY KEY,
  uom_code VARCHAR(20) UNIQUE NOT NULL,
  uom_name VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO uom_master (uom_code, uom_name) VALUES
('PCS', 'Pieces'), ('PAIR', 'Pair'), ('MTR', 'Meter'),
('KG', 'Kilogram'), ('LTR', 'Litre'), ('SQF', 'Square Feet'),
('SQMT', 'Square Meter'), ('SET', 'Set'), ('BOX', 'Box'),
('DOZ', 'Dozen'), ('ROLL', 'Roll'), ('GRAM', 'Gram')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS brand_master (
  id SERIAL PRIMARY KEY,
  brand_name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS category_master (
  id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO category_master (category_name) VALUES
('INFANT'), ('KIDS'), ('LADIES'), ('MEN'), ('UNISEX')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS sub_category_master (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES category_master(id),
  sub_category_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS design_master (
  id SERIAL PRIMARY KEY,
  design_no VARCHAR(50) UNIQUE NOT NULL,
  design_name VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS color_master (
  id SERIAL PRIMARY KEY,
  color_code VARCHAR(20) UNIQUE NOT NULL,
  color_name VARCHAR(50) NOT NULL,
  hex_code VARCHAR(10),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO color_master (color_code, color_name) VALUES
('BLK', 'Black'), ('WHT', 'White'), ('BRN', 'Brown'),
('TAN', 'Tan'), ('NVY', 'Navy'), ('RED', 'Red'),
('GRY', 'Grey'), ('BEG', 'Beige')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS hsn_master (
  id SERIAL PRIMARY KEY,
  hsn_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  gst_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO hsn_master (hsn_code, description, gst_rate) VALUES
('6401', 'Waterproof footwear', 12),
('6402', 'Other footwear with outer soles', 12),
('6403', 'Footwear with outer soles of rubber', 12),
('6404', 'Footwear with outer soles of rubber/plastics', 5),
('6405', 'Other footwear', 5),
('6406', 'Parts of footwear', 18)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS size_chart_master (
  id SERIAL PRIMARY KEY,
  chart_name VARCHAR(50) NOT NULL,
  category VARCHAR(30) NOT NULL,
  uk_size VARCHAR(10),
  euro_size VARCHAR(10),
  us_size VARCHAR(10),
  is_active BOOLEAN DEFAULT true
);
INSERT INTO size_chart_master (chart_name, category, uk_size, euro_size) VALUES
('INFANT', 'INFANT', '2', '19'), ('INFANT', 'INFANT', '3', '20'), ('INFANT', 'INFANT', '5', '21'), ('INFANT', 'INFANT', '6', '22'), ('INFANT', 'INFANT', '7', '23'), ('INFANT', 'INFANT', '8', '24'), ('INFANT', 'INFANT', '9', '25'), ('INFANT', 'INFANT', '10', '26'), ('INFANT', 'INFANT', '11', '27'), ('INFANT', 'INFANT', '12', '28'),
('KIDS', 'KIDS', '6', '24'), ('KIDS', 'KIDS', '7', '25'), ('KIDS', 'KIDS', '8', '26'), ('KIDS', 'KIDS', '9', '27'), ('KIDS', 'KIDS', '10', '28'), ('KIDS', 'KIDS', '11', '29'), ('KIDS', 'KIDS', '11.5', '30'), ('KIDS', 'KIDS', '12', '31'), ('KIDS', 'KIDS', '12.5', '32'), ('KIDS', 'KIDS', '13', '33'), ('KIDS', 'KIDS', '1', '34'), ('KIDS', 'KIDS', '2', '35'), ('KIDS', 'KIDS', '3', '36'), ('KIDS', 'KIDS', '4', '37'), ('KIDS', 'KIDS', '5', '38'), ('KIDS', 'KIDS', '6', '39'),
('LADIES', 'LADIES', '3', '36'), ('LADIES', 'LADIES', '4', '37'), ('LADIES', 'LADIES', '5', '38'), ('LADIES', 'LADIES', '6', '39'), ('LADIES', 'LADIES', '7', '40'), ('LADIES', 'LADIES', '8', '41'), ('LADIES', 'LADIES', '9', '42'),
('MEN', 'MEN', '6', '40'), ('MEN', 'MEN', '7', '41'), ('MEN', 'MEN', '8', '42'), ('MEN', 'MEN', '9', '43'), ('MEN', 'MEN', '10', '44'), ('MEN', 'MEN', '11', '45'), ('MEN', 'MEN', '12', '46')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS location_master (
  id SERIAL PRIMARY KEY,
  location_code VARCHAR(50) UNIQUE NOT NULL,
  location_name VARCHAR(100) NOT NULL,
  location_type VARCHAR(50) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS size_master (
  id SERIAL PRIMARY KEY,
  size_code VARCHAR(10) NOT NULL UNIQUE,
  size_label VARCHAR(20) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
INSERT INTO size_master (size_code, size_label, sort_order) VALUES
('UK5','Size 5 (UK)',10), ('UK6','Size 6 (UK)',20), ('UK7','Size 7 (UK)',30), ('UK8','Size 8 (UK)',40), ('UK9','Size 9 (UK)',50), ('UK10','Size 10 (UK)',60), ('UK11','Size 11 (UK)',70)
ON CONFLICT (size_code) DO NOTHING;

-- Products & Raw Materials
CREATE TABLE IF NOT EXISTS raw_material_master (
    id SERIAL PRIMARY KEY,
    sku_code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    rate NUMERIC(12, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_master (
    id SERIAL PRIMARY KEY,
    sku_code VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    product_type product_type_enum NOT NULL,
    uom VARCHAR(20) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE product_master ADD COLUMN IF NOT EXISTS short_description VARCHAR(255);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS long_description TEXT;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS uom_id INTEGER REFERENCES uom_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS pack_size INTEGER DEFAULT 1;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS pack_size_uom_id INTEGER REFERENCES uom_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS brand_id INTEGER REFERENCES brand_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES category_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS sub_category_id INTEGER REFERENCES sub_category_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS design_id INTEGER REFERENCES design_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS color_id INTEGER REFERENCES color_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS hsn_id INTEGER REFERENCES hsn_master(id);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS size_chart VARCHAR(30);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS basic_cost_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS mrp NUMERIC(12,2) DEFAULT 0;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS sp NUMERIC(12,2) DEFAULT 0;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS gst_rate NUMERIC(5,2) DEFAULT 0;
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS hsn_code VARCHAR(20);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS brand_name VARCHAR(100);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(100);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS design_no VARCHAR(50);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS sub_category VARCHAR(100);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS color VARCHAR(50);
ALTER TABLE product_master ADD COLUMN IF NOT EXISTS rate NUMERIC(12,4) DEFAULT 0;

-- BOM
CREATE TABLE IF NOT EXISTS bom_header (
    id SERIAL PRIMARY KEY,
    bom_code VARCHAR(20) NOT NULL UNIQUE,
    output_sku VARCHAR(50) NOT NULL REFERENCES product_master (sku_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    output_qty NUMERIC(12, 4) NOT NULL DEFAULT 1,
    output_uom VARCHAR(20) NOT NULL,
    bom_type bom_type_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bom_lines (
    id SERIAL PRIMARY KEY,
    bom_id INTEGER NOT NULL REFERENCES bom_header (id) ON DELETE CASCADE,
    input_sku VARCHAR(50) NOT NULL REFERENCES product_master (sku_code) ON UPDATE CASCADE ON DELETE RESTRICT,
    consume_qty NUMERIC(12, 6) NOT NULL,
    uom VARCHAR(20) NOT NULL,
    rate_at_bom NUMERIC(12, 4) NOT NULL DEFAULT 0,
    line_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bom_id, input_sku)
);

-- Work Orders
CREATE TABLE IF NOT EXISTS work_order_header (
    id SERIAL PRIMARY KEY,
    wo_number VARCHAR(20) NOT NULL UNIQUE,
    bom_id INTEGER NOT NULL REFERENCES bom_header (id) ON DELETE RESTRICT,
    wo_date DATE NOT NULL DEFAULT CURRENT_DATE,
    planned_qty NUMERIC(12, 4) NOT NULL,
    received_qty NUMERIC(12, 4) NOT NULL DEFAULT 0,
    status wo_status_enum NOT NULL DEFAULT 'DRAFT',
    wo_type wo_type_enum NOT NULL,
    from_store VARCHAR(100) NOT NULL,
    to_store VARCHAR(100) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE work_order_header ADD COLUMN IF NOT EXISTS from_location_id INTEGER;
ALTER TABLE work_order_header ADD COLUMN IF NOT EXISTS to_location_id INTEGER;

CREATE TABLE IF NOT EXISTS wo_receipt_lines (
    id SERIAL PRIMARY KEY,
    wo_id INTEGER NOT NULL REFERENCES work_order_header (id) ON DELETE RESTRICT,
    received_qty NUMERIC(12, 4) NOT NULL,
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wo_receipt_lines ADD COLUMN IF NOT EXISTS receipt_no VARCHAR(50);
ALTER TABLE wo_receipt_lines ADD COLUMN IF NOT EXISTS rejection_qty DECIMAL(12,4) DEFAULT 0;
ALTER TABLE wo_receipt_lines ADD COLUMN IF NOT EXISTS from_location_id INTEGER;
ALTER TABLE wo_receipt_lines ADD COLUMN IF NOT EXISTS to_location_id INTEGER;

CREATE TABLE IF NOT EXISTS work_order_bom_lines (
  id SERIAL PRIMARY KEY,
  wo_id INTEGER REFERENCES work_order_header(id) ON DELETE CASCADE,
  input_sku VARCHAR(50),
  consume_qty DECIMAL(12,6),
  uom VARCHAR(20),
  rate_at_wo DECIMAL(12,4),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Inventory
CREATE TABLE IF NOT EXISTS stock_summary (
  sku_code VARCHAR(50) PRIMARY KEY,
  sku_description VARCHAR(255),
  uom VARCHAR(20),
  current_qty DECIMAL(12,3) DEFAULT 0,
  current_value DECIMAL(14,2) DEFAULT 0,
  avg_rate DECIMAL(12,2) DEFAULT 0,
  reorder_level DECIMAL(12,3) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  sku_code VARCHAR(50) NOT NULL,
  sku_description VARCHAR(255),
  uom VARCHAR(20),
  transaction_type VARCHAR(30) NOT NULL,
  reference_no VARCHAR(50),      
  reference_type VARCHAR(20),    
  qty_in DECIMAL(12,3) DEFAULT 0,
  qty_out DECIMAL(12,3) DEFAULT 0,
  rate DECIMAL(12,2),
  value_in DECIMAL(14,2) DEFAULT 0,
  value_out DECIMAL(14,2) DEFAULT 0,
  running_balance DECIMAL(12,3), 
  running_value DECIMAL(14,2),   
  remarks VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS location_id INTEGER;
ALTER TABLE stock_ledger ADD COLUMN IF NOT EXISTS location_name VARCHAR(100);

-- Purchasing & Suppliers
CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  supplier_code VARCHAR(20) UNIQUE NOT NULL,
  supplier_name VARCHAR(150) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  state VARCHAR(50),
  pincode VARCHAR(10),
  gstin VARCHAR(20),
  payment_terms VARCHAR(100),
  credit_limit DECIMAL(14,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_by INTEGER;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE TABLE IF NOT EXISTS supplier_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  transaction_type VARCHAR(30),
  reference_no VARCHAR(50),
  debit DECIMAL(14,2) DEFAULT 0,
  credit DECIMAL(14,2) DEFAULT 0,
  running_balance DECIMAL(14,2),
  remarks VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_no VARCHAR(20) UNIQUE NOT NULL,
  po_date DATE NOT NULL,
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_name VARCHAR(150),
  expected_delivery_date DATE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  total_value DECIMAL(14,2) DEFAULT 0,
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS po_lines (
  id SERIAL PRIMARY KEY,
  po_id INTEGER REFERENCES purchase_orders(id),
  line_no INTEGER NOT NULL,
  sku_code VARCHAR(50) NOT NULL,
  sku_description VARCHAR(255),
  uom VARCHAR(20),
  ordered_qty DECIMAL(12,3) NOT NULL,
  received_qty DECIMAL(12,3) DEFAULT 0,
  pending_qty DECIMAL(12,3),
  rate DECIMAL(12,2) NOT NULL,
  line_value DECIMAL(14,2),
  UNIQUE(po_id, line_no)
);

CREATE TABLE IF NOT EXISTS po_receipts (
  id SERIAL PRIMARY KEY,
  grn_no VARCHAR(20) UNIQUE NOT NULL,
  grn_date DATE NOT NULL,
  po_id INTEGER REFERENCES purchase_orders(id),
  po_no VARCHAR(20),
  supplier_id INTEGER REFERENCES suppliers(id),
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE po_receipts ADD COLUMN IF NOT EXISTS challan_no VARCHAR(50);
ALTER TABLE po_receipts ADD COLUMN IF NOT EXISTS challan_date DATE;

CREATE TABLE IF NOT EXISTS po_receipt_lines (
  id SERIAL PRIMARY KEY,
  grn_id INTEGER REFERENCES po_receipts(id),
  po_line_id INTEGER REFERENCES po_lines(id),
  sku_code VARCHAR(50),
  received_qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2),
  value DECIMAL(14,2)
);

CREATE TABLE IF NOT EXISTS purchase_returns (
  id SERIAL PRIMARY KEY,
  return_no VARCHAR(50) UNIQUE NOT NULL,
  return_date DATE NOT NULL,
  po_id INTEGER REFERENCES purchase_orders(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  remarks TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_return_lines (
  id SERIAL PRIMARY KEY,
  return_id INTEGER REFERENCES purchase_returns(id),
  sku_code VARCHAR(50),
  return_qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2),
  value DECIMAL(14,2)
);

-- Settings & Notifications
CREATE TABLE IF NOT EXISTS company_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_group VARCHAR(50),
  label VARCHAR(100),
  input_type VARCHAR(20) DEFAULT 'text',
  options TEXT,
  updated_by INTEGER REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW()
);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS updated_by INTEGER;

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  reference_type VARCHAR(30),
  reference_id VARCHAR(50),
  severity VARCHAR(10) DEFAULT 'INFO',
  is_read BOOLEAN DEFAULT FALSE,
  target_roles TEXT DEFAULT 'admin,manager',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wo_size_breakup (
  id SERIAL PRIMARY KEY,
  wo_id INTEGER REFERENCES work_order_header(id) ON DELETE CASCADE,
  size_code VARCHAR(10) NOT NULL,
  planned_qty INTEGER DEFAULT 0,
  received_qty INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wo_size_receipts (
  id SERIAL PRIMARY KEY,
  receipt_id INTEGER REFERENCES wo_receipt_lines(id) ON DELETE CASCADE,
  wo_id INTEGER REFERENCES work_order_header(id) ON DELETE CASCADE,
  size_code VARCHAR(10) NOT NULL,
  receive_qty INTEGER DEFAULT 0,
  rejection_qty INTEGER DEFAULT 0,
  rejection_reason VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
