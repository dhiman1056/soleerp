-- =============================================================================
-- SHOE MANUFACTURING ERP - DATABASE SCHEMA
-- Database: shoe_erp_db
-- Created:  2026-04-12
-- =============================================================================

-- Run as: psql -U postgres -c "CREATE DATABASE shoe_erp_db;" && psql -U postgres -d shoe_erp_db -f schema.sql

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE product_type_enum   AS ENUM ('RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED');
CREATE TYPE bom_type_enum       AS ENUM ('SF', 'FG', 'FG_DIRECT');
CREATE TYPE wo_status_enum      AS ENUM ('DRAFT', 'ISSUED', 'WIP', 'PARTIAL', 'RECEIVED');
CREATE TYPE wo_type_enum        AS ENUM ('RM_TO_SF', 'SF_TO_FG', 'RM_TO_FG');

-- =============================================================================
-- 1. RAW MATERIAL MASTER
--    Stores procurement-level items: leather, adhesives, thread, etc.
-- =============================================================================

CREATE TABLE raw_material_master (
    id          SERIAL          PRIMARY KEY,
    sku_code    VARCHAR(50)     NOT NULL UNIQUE,
    description VARCHAR(255)    NOT NULL,
    uom         VARCHAR(20)     NOT NULL,           -- e.g. KG, MTR, PCS, PAIR
    rate        NUMERIC(12, 4)  NOT NULL DEFAULT 0, -- rate per unit (INR)
    is_active   BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  raw_material_master             IS 'Master list of all raw materials used in shoe manufacturing';
COMMENT ON COLUMN raw_material_master.sku_code    IS 'Unique Stock Keeping Unit code for the raw material';
COMMENT ON COLUMN raw_material_master.uom         IS 'Unit of Measurement (KG, MTR, PCS, PAIR, LTR, etc.)';
COMMENT ON COLUMN raw_material_master.rate        IS 'Standard cost per unit in INR at time of last update';

CREATE INDEX idx_rm_sku_code  ON raw_material_master (sku_code);
CREATE INDEX idx_rm_is_active ON raw_material_master (is_active);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION fn_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rm_updated_at
    BEFORE UPDATE ON raw_material_master
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- 2. PRODUCT MASTER
--    Covers RM, semi-finished (uppers, soles), and finished shoes.
-- =============================================================================

CREATE TABLE product_master (
    id           SERIAL              PRIMARY KEY,
    sku_code     VARCHAR(50)         NOT NULL UNIQUE,
    description  VARCHAR(255)        NOT NULL,
    product_type product_type_enum   NOT NULL,
    uom          VARCHAR(20)         NOT NULL,
    created_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  product_master              IS 'Unified product catalogue: raw materials, semi-finished, and finished goods';
COMMENT ON COLUMN product_master.product_type IS 'RAW_MATERIAL | SEMI_FINISHED | FINISHED';

CREATE INDEX idx_pm_sku_code     ON product_master (sku_code);
CREATE INDEX idx_pm_product_type ON product_master (product_type);

CREATE TRIGGER trg_pm_updated_at
    BEFORE UPDATE ON product_master
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- 3. BILL OF MATERIAL (BOM) HEADER
--    Defines how to produce one finished / semi-finished SKU.
-- =============================================================================

CREATE TABLE bom_header (
    id              SERIAL          PRIMARY KEY,
    bom_code        VARCHAR(20)     NOT NULL UNIQUE,         -- e.g. BOM-001
    output_sku      VARCHAR(50)     NOT NULL,                -- FK → product_master.sku_code
    output_qty      NUMERIC(12, 4)  NOT NULL DEFAULT 1,      -- quantity produced per batch
    output_uom      VARCHAR(20)     NOT NULL,
    bom_type        bom_type_enum   NOT NULL,
    -- SF         → Semi-Finished (RM → SF)
    -- FG         → Finished Good assembled from SF + RM
    -- FG_DIRECT  → Finished Good produced directly from RM only
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    remarks         TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bom_output_sku
        FOREIGN KEY (output_sku)
        REFERENCES product_master (sku_code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
);

COMMENT ON TABLE  bom_header          IS 'BOM header: describes what product is produced and how many units per batch';
COMMENT ON COLUMN bom_header.bom_type IS 'SF=RM→SemiFinished, FG=SF+RM→Finished, FG_DIRECT=RM→Finished';

CREATE INDEX idx_bom_output_sku  ON bom_header (output_sku);
CREATE INDEX idx_bom_is_active   ON bom_header (is_active);
CREATE INDEX idx_bom_bom_type    ON bom_header (bom_type);

CREATE TRIGGER trg_bom_header_updated_at
    BEFORE UPDATE ON bom_header
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();


-- =============================================================================
-- 4. BILL OF MATERIAL LINES
--    Individual input components for a BOM batch.
-- =============================================================================

CREATE TABLE bom_lines (
    id              SERIAL          PRIMARY KEY,
    bom_id          INTEGER         NOT NULL,                -- FK → bom_header.id
    input_sku       VARCHAR(50)     NOT NULL,                -- raw material or SF SKU
    consume_qty     NUMERIC(12, 6)  NOT NULL,                -- qty consumed per output unit
    uom             VARCHAR(20)     NOT NULL,
    rate_at_bom     NUMERIC(12, 4)  NOT NULL DEFAULT 0,      -- price captured at BOM creation
    line_remarks    TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_bom_lines_header
        FOREIGN KEY (bom_id)
        REFERENCES bom_header (id)
        ON DELETE CASCADE,

    CONSTRAINT fk_bom_lines_input_sku
        FOREIGN KEY (input_sku)
        REFERENCES product_master (sku_code)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT uq_bom_lines_bom_sku UNIQUE (bom_id, input_sku)  -- no duplicate material per BOM
);

COMMENT ON TABLE  bom_lines              IS 'BOM line items: each row is one input material for the parent BOM';
COMMENT ON COLUMN bom_lines.consume_qty  IS 'Quantity of input_sku consumed to produce ONE unit of output';
COMMENT ON COLUMN bom_lines.rate_at_bom  IS 'Locked rate (INR/unit) at the time the BOM was created';

CREATE INDEX idx_bomlines_bom_id    ON bom_lines (bom_id);
CREATE INDEX idx_bomlines_input_sku ON bom_lines (input_sku);


-- =============================================================================
-- 5. WORK ORDER HEADER
--    A production instruction tied to a specific BOM.
-- =============================================================================

CREATE SEQUENCE wo_seq START 1 INCREMENT 1;

CREATE TABLE work_order_header (
    id              SERIAL          PRIMARY KEY,
    wo_number       VARCHAR(20)     NOT NULL UNIQUE,         -- e.g. WO-001 (generated via trigger)
    bom_id          INTEGER         NOT NULL,                -- FK → bom_header.id
    wo_date         DATE            NOT NULL DEFAULT CURRENT_DATE,
    planned_qty     NUMERIC(12, 4)  NOT NULL,
    received_qty    NUMERIC(12, 4)  NOT NULL DEFAULT 0,
    status          wo_status_enum  NOT NULL DEFAULT 'DRAFT',
    wo_type         wo_type_enum    NOT NULL,
    from_store      VARCHAR(100)    NOT NULL,                -- e.g. 'RAW MATERIAL STORE'
    to_store        VARCHAR(100)    NOT NULL,                -- e.g. 'PRODUCTION FLOOR'
    notes           TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_wo_bom
        FOREIGN KEY (bom_id)
        REFERENCES bom_header (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_received_lte_planned
        CHECK (received_qty <= planned_qty),

    CONSTRAINT chk_planned_qty_positive
        CHECK (planned_qty > 0)
);

COMMENT ON TABLE  work_order_header             IS 'Work Order header: one production run instruction per WO';
COMMENT ON COLUMN work_order_header.wo_number   IS 'Auto-generated WO number in format WO-001, WO-002…';
COMMENT ON COLUMN work_order_header.from_store  IS 'Source store/warehouse issuing raw materials';
COMMENT ON COLUMN work_order_header.to_store    IS 'Destination store/production floor receiving output';

CREATE INDEX idx_wo_bom_id     ON work_order_header (bom_id);
CREATE INDEX idx_wo_status     ON work_order_header (status);
CREATE INDEX idx_wo_wo_type    ON work_order_header (wo_type);
CREATE INDEX idx_wo_wo_date    ON work_order_header (wo_date DESC);

-- Auto-generate WO number trigger
CREATE OR REPLACE FUNCTION fn_generate_wo_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.wo_number := 'WO-' || LPAD(nextval('wo_seq')::TEXT, 4, '0');
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wo_generate_number
    BEFORE INSERT ON work_order_header
    FOR EACH ROW
    WHEN (NEW.wo_number IS NULL OR NEW.wo_number = '')
    EXECUTE FUNCTION fn_generate_wo_number();

CREATE TRIGGER trg_wo_updated_at
    BEFORE UPDATE ON work_order_header
    FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at();

-- Auto-update WO status based on received_qty
CREATE OR REPLACE FUNCTION fn_update_wo_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.received_qty = 0 THEN
        NEW.status := 'ISSUED';
    ELSIF NEW.received_qty < NEW.planned_qty THEN
        NEW.status := 'PARTIAL';
    ELSIF NEW.received_qty >= NEW.planned_qty THEN
        NEW.status := 'RECEIVED';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_wo_auto_status
    BEFORE UPDATE OF received_qty ON work_order_header
    FOR EACH ROW EXECUTE FUNCTION fn_update_wo_status();


-- =============================================================================
-- 6. WORK ORDER RECEIPT LINES
--    Records each partial or full receipt against a WO.
-- =============================================================================

CREATE TABLE wo_receipt_lines (
    id              SERIAL          PRIMARY KEY,
    wo_id           INTEGER         NOT NULL,               -- FK → work_order_header.id
    received_qty    NUMERIC(12, 4)  NOT NULL,
    receipt_date    DATE            NOT NULL DEFAULT CURRENT_DATE,
    remarks         TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_receipt_wo
        FOREIGN KEY (wo_id)
        REFERENCES work_order_header (id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_receipt_qty_positive
        CHECK (received_qty > 0)
);

COMMENT ON TABLE  wo_receipt_lines          IS 'Individual receipt entries against a work order (supports partial receipts)';
COMMENT ON COLUMN wo_receipt_lines.wo_id    IS 'Parent work order; multiple receipts allowed per WO';

CREATE INDEX idx_receipt_wo_id       ON wo_receipt_lines (wo_id);
CREATE INDEX idx_receipt_date        ON wo_receipt_lines (receipt_date DESC);

-- After inserting a receipt line, roll up received_qty to the WO header
CREATE OR REPLACE FUNCTION fn_rollup_wo_receipt()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    UPDATE work_order_header
    SET    received_qty = (
               SELECT COALESCE(SUM(r.received_qty), 0)
               FROM   wo_receipt_lines r
               WHERE  r.wo_id = NEW.wo_id
           )
    WHERE  id = NEW.wo_id;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rollup_receipt
    AFTER INSERT OR UPDATE OR DELETE ON wo_receipt_lines
    FOR EACH ROW EXECUTE FUNCTION fn_rollup_wo_receipt();


-- =============================================================================
-- 7. WIP VIEW
--    Work orders where production is not yet fully received.
--    WIP Qty  = planned_qty - received_qty
--    WIP Value = WIP Qty × (SUM of BOM line costs per output unit)
-- =============================================================================

CREATE OR REPLACE VIEW v_wip AS
WITH bom_unit_cost AS (
    -- Calculate total standard cost to produce ONE unit of output for each BOM
    SELECT
        bl.bom_id,
        ROUND(
            SUM(bl.consume_qty * bl.rate_at_bom),
            4
        ) AS unit_cost
    FROM  bom_lines bl
    GROUP BY bl.bom_id
)
SELECT
    wo.id                                           AS wo_id,
    wo.wo_number,
    wo.wo_type,
    wo.wo_date,
    wo.status,
    wo.from_store,
    wo.to_store,

    -- BOM / output product details
    bh.bom_code,
    bh.output_sku,
    pm.description                                  AS output_description,
    bh.output_uom,

    -- Quantities
    wo.planned_qty,
    wo.received_qty,
    (wo.planned_qty - wo.received_qty)              AS wip_qty,

    -- Cost
    COALESCE(buc.unit_cost, 0)                      AS unit_cost,
    ROUND(
        (wo.planned_qty - wo.received_qty) * COALESCE(buc.unit_cost, 0),
        2
    )                                               AS wip_value,

    wo.created_at

FROM  work_order_header  wo
JOIN  bom_header         bh  ON bh.id       = wo.bom_id
JOIN  product_master     pm  ON pm.sku_code = bh.output_sku
LEFT  JOIN bom_unit_cost buc ON buc.bom_id  = wo.bom_id

WHERE wo.planned_qty > wo.received_qty   -- still has open WIP
  AND wo.status NOT IN ('DRAFT', 'RECEIVED')

ORDER BY wo.wo_date DESC, wo.wo_number;

COMMENT ON VIEW v_wip IS
    'Live WIP view: shows all open work orders with WIP quantity and estimated WIP value based on BOM standard costs';
