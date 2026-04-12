-- =============================================================================
-- SHOE MANUFACTURING ERP - SEED DATA
-- Database: shoe_erp_db
-- Run after schema.sql
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: RAW MATERIAL MASTER  (5 records)
-- =============================================================================

INSERT INTO raw_material_master (sku_code, description, uom, rate, is_active) VALUES
    ('RM-LEA-001', 'Full Grain Leather — Black, 1.8–2.0mm',  'SQF',  85.00,  TRUE),
    ('RM-LEA-002', 'Split Leather Lining — Natural Beige',   'SQF',  42.50,  TRUE),
    ('RM-SOL-001', 'TPR Rubber Sole — Size 8 (Unisex)',      'PCS',  38.00,  TRUE),
    ('RM-ADH-001', 'Contact Cement Adhesive — 1L Can',       'LTR', 220.00,  TRUE),
    ('RM-THR-001', 'Nylon Stitching Thread — Black 210D',    'MTR',   1.80,  TRUE);

-- =============================================================================
-- SECTION 2: PRODUCT MASTER  (2 SF + 1 FG + 5 RM mirrors)
-- =============================================================================

-- Mirror RM SKUs in product_master so BOM lines can reference them
INSERT INTO product_master (sku_code, description, product_type, uom) VALUES
    ('RM-LEA-001', 'Full Grain Leather — Black, 1.8–2.0mm',  'RAW_MATERIAL',  'SQF'),
    ('RM-LEA-002', 'Split Leather Lining — Natural Beige',   'RAW_MATERIAL',  'SQF'),
    ('RM-SOL-001', 'TPR Rubber Sole — Size 8 (Unisex)',      'RAW_MATERIAL',  'PCS'),
    ('RM-ADH-001', 'Contact Cement Adhesive — 1L Can',       'RAW_MATERIAL',  'LTR'),
    ('RM-THR-001', 'Nylon Stitching Thread — Black 210D',    'RAW_MATERIAL',  'MTR'),

    -- Semi-finished products (Uppers)
    ('SF-UPP-001', 'Leather Upper Assembly — Black Oxford, Size 8',   'SEMI_FINISHED', 'PAIR'),
    ('SF-UPP-002', 'Leather Upper Assembly — Black Derby, Size 9',    'SEMI_FINISHED', 'PAIR'),

    -- Finished goods
    ('FG-SHO-001', 'Gents Oxford Leather Shoe — Black, Size 8',       'FINISHED',      'PAIR');


-- =============================================================================
-- SECTION 3: BOM HEADERS  (2 BOMs)
-- =============================================================================

-- BOM-0001: RM → Semi-Finished Upper (SF type)
INSERT INTO bom_header (bom_code, output_sku, output_qty, output_uom, bom_type, is_active, remarks) VALUES
    ('BOM-0001', 'SF-UPP-001', 1, 'PAIR', 'SF',
     'Standard BOM for producing 1 PAIR of Black Oxford leather upper from raw materials');

-- BOM-0002: SF + RM → Finished Oxford Shoe (FG type; uses the upper from BOM-0001)
INSERT INTO bom_header (bom_code, output_sku, output_qty, output_uom, bom_type, is_active, remarks) VALUES
    ('BOM-0002', 'FG-SHO-001', 1, 'PAIR', 'FG',
     'Assembly BOM: combines SF upper, rubber sole, and adhesive to produce 1 PAIR finished Oxford shoe');


-- =============================================================================
-- SECTION 4: BOM LINES
-- =============================================================================

-- Lines for BOM-0001 (Upper Assembly)
-- Assumes BOM-0001 got id = 1
INSERT INTO bom_lines (bom_id, input_sku, consume_qty, uom, rate_at_bom, line_remarks)
SELECT
    bh.id,
    v.input_sku,
    v.consume_qty,
    v.uom,
    v.rate_at_bom,
    v.line_remarks
FROM  bom_header bh,
(VALUES
    ('RM-LEA-001',  2.5000, 'SQF',   85.00, '~2.5 sqft leather per pair upper'),
    ('RM-LEA-002',  1.8000, 'SQF',   42.50, '~1.8 sqft lining leather per pair'),
    ('RM-THR-001', 18.0000, 'MTR',    1.80, '18m thread per pair for stitching')
) AS v(input_sku, consume_qty, uom, rate_at_bom, line_remarks)
WHERE bh.bom_code = 'BOM-0001';

-- Lines for BOM-0002 (Finished Shoe Assembly)
INSERT INTO bom_lines (bom_id, input_sku, consume_qty, uom, rate_at_bom, line_remarks)
SELECT
    bh.id,
    v.input_sku,
    v.consume_qty,
    v.uom,
    v.rate_at_bom,
    v.line_remarks
FROM  bom_header bh,
(VALUES
    ('SF-UPP-001',  1.0000, 'PAIR', 312.00, '1 pair upper (standard cost of BOM-0001 output)'),
    ('RM-SOL-001',  2.0000, 'PCS',   38.00, '2 rubber sole pieces (L+R)'),
    ('RM-ADH-001',  0.0600, 'LTR',  220.00, '~60ml adhesive per pair')
) AS v(input_sku, consume_qty, uom, rate_at_bom, line_remarks)
WHERE bh.bom_code = 'BOM-0002';


-- =============================================================================
-- SECTION 5: WORK ORDER HEADERS  (2 WOs)
-- =============================================================================

-- WO-1: Produce 50 pairs of Upper (RM → SF)
INSERT INTO work_order_header
    (wo_number, bom_id, wo_date, planned_qty, received_qty, status, wo_type, from_store, to_store, notes)
SELECT
    'WO-0001',
    bh.id,
    CURRENT_DATE - INTERVAL '5 days',
    50,
    0,
    'ISSUED',
    'RM_TO_SF',
    'Raw Material Store - Block A',
    'Stitching & Cutting Floor',
    'Pilot run for Black Oxford upper assembly. Check leather wastage carefully.'
FROM  bom_header bh
WHERE bh.bom_code = 'BOM-0001';

-- WO-2: Assemble 30 pairs of finished shoes (SF → FG)
INSERT INTO work_order_header
    (wo_number, bom_id, wo_date, planned_qty, received_qty, status, wo_type, from_store, to_store, notes)
SELECT
    'WO-0002',
    bh.id,
    CURRENT_DATE - INTERVAL '2 days',
    30,
    0,
    'ISSUED',
    'SF_TO_FG',
    'WIP Store',
    'Finished Goods Warehouse',
    'Use uppers from WO-0001. Adhesive must cure for 24h before dispatch.'
FROM  bom_header bh
WHERE bh.bom_code = 'BOM-0002';


-- =============================================================================
-- SECTION 6: PARTIAL RECEIPT for WO-0001 (simulate WIP)
--            Receive 20 of the 50 planned uppers
-- =============================================================================

INSERT INTO wo_receipt_lines (wo_id, received_qty, receipt_date, remarks)
SELECT
    wo.id,
    20,
    CURRENT_DATE - INTERVAL '1 day',
    'First batch of 20 pairs upper received from stitching floor. QC passed.'
FROM  work_order_header wo
WHERE wo.wo_number = 'WO-0001';

-- After this insert the trigger fn_rollup_wo_receipt fires and sets
-- work_order_header.received_qty = 20   → status auto-updates to PARTIAL


-- =============================================================================
-- QUICK VERIFICATION QUERIES  (comment out if not needed)
-- =============================================================================

/*

-- 1. Check all tables are populated
SELECT 'raw_material_master' AS tbl, COUNT(*) FROM raw_material_master
UNION ALL SELECT 'product_master',     COUNT(*) FROM product_master
UNION ALL SELECT 'bom_header',         COUNT(*) FROM bom_header
UNION ALL SELECT 'bom_lines',          COUNT(*) FROM bom_lines
UNION ALL SELECT 'work_order_header',  COUNT(*) FROM work_order_header
UNION ALL SELECT 'wo_receipt_lines',   COUNT(*) FROM wo_receipt_lines;

-- 2. View current WIP
SELECT * FROM v_wip;

-- 3. BOM explosion for BOM-0001
SELECT
    bh.bom_code,
    bh.output_sku,
    bl.input_sku,
    bl.consume_qty,
    bl.uom,
    bl.rate_at_bom,
    ROUND(bl.consume_qty * bl.rate_at_bom, 4) AS line_cost
FROM bom_header bh
JOIN bom_lines  bl ON bl.bom_id = bh.id
WHERE bh.bom_code = 'BOM-0001'
ORDER BY bl.id;

*/

-- =============================================================================
-- SECTION 7: DEFAULT USERS
-- =============================================================================
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin User', 'admin@shoecompany.com', 
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 
 'admin'),
('Manager User', 'manager@shoecompany.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'manager'),
('Operator User', 'operator@shoecompany.com',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'operator')
ON CONFLICT (email) DO NOTHING;

COMMIT;
