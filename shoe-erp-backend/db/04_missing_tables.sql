CREATE TABLE IF NOT EXISTS wo_size_breakup (
  id SERIAL PRIMARY KEY,
  wo_id INTEGER REFERENCES work_order_header(id),
  size_code VARCHAR(10),
  planned_qty INTEGER NOT NULL,
  received_qty INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bom_size_variants (
  id SERIAL PRIMARY KEY,
  bom_id INTEGER REFERENCES bom_header(id),
  size_code VARCHAR(10),
  component_sku VARCHAR(50),
  consume_qty DECIMAL(10,4) NOT NULL,
  uom VARCHAR(20)
);
