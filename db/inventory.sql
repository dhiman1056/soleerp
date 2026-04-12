-- =============================================================================
-- INVENTORY LEDGER & PURCHASES
-- =============================================================================

CREATE TABLE stock_ledger (
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

CREATE TABLE stock_summary (
  sku_code VARCHAR(50) PRIMARY KEY,
  sku_description VARCHAR(255),
  uom VARCHAR(20),
  current_qty DECIMAL(12,3) DEFAULT 0,
  current_value DECIMAL(14,2) DEFAULT 0,
  avg_rate DECIMAL(12,2) DEFAULT 0,
  reorder_level DECIMAL(12,3) DEFAULT 0,
  last_updated TIMESTAMP DEFAULT NOW()
);

CREATE TABLE purchases (
  id SERIAL PRIMARY KEY,
  purchase_no VARCHAR(50) UNIQUE NOT NULL,
  purchase_date DATE NOT NULL,
  supplier_name VARCHAR(100),
  sku_code VARCHAR(50) NOT NULL,
  sku_description VARCHAR(255),
  uom VARCHAR(20),
  qty DECIMAL(12,3) NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  total_value DECIMAL(14,2),
  remarks VARCHAR(255),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
