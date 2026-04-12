-- =============================================================================
-- MULTI-SIZE SUPPORT
-- =============================================================================

CREATE TABLE size_master (
  id SERIAL PRIMARY KEY,
  size_code VARCHAR(10) NOT NULL UNIQUE,
  size_label VARCHAR(20) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed Data
INSERT INTO size_master (size_code, size_label, sort_order) VALUES
('UK5','Size 5 (UK)',10),
('UK6','Size 6 (UK)',20),
('UK7','Size 7 (UK)',30),
('UK8','Size 8 (UK)',40),
('UK9','Size 9 (UK)',50),
('UK10','Size 10 (UK)',60),
('UK11','Size 11 (UK)',70)
ON CONFLICT (size_code) DO NOTHING;

CREATE TABLE bom_size_variants (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER REFERENCES bom_header(id) ON DELETE CASCADE,
  size_code VARCHAR(10) REFERENCES size_master(size_code),
  component_sku VARCHAR(50) REFERENCES product_master(sku_code),
  consume_qty DECIMAL(10,4) NOT NULL,
  uom VARCHAR(20),
  UNIQUE(bom_id, size_code, component_sku)
);

CREATE TABLE wo_size_breakup (
  id SERIAL PRIMARY KEY,
  wo_id INTEGER REFERENCES work_order_header(id) ON DELETE CASCADE,
  size_code VARCHAR(10) REFERENCES size_master(size_code),
  planned_qty INTEGER NOT NULL,
  received_qty INTEGER DEFAULT 0,
  UNIQUE(wo_id, size_code)
);
