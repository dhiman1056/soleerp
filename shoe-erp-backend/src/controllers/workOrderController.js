'use strict';

const { query, pool } = require('../config/db');

const listWorkOrders = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        w.id, w.wo_number, w.bom_id, w.wo_date,
        w.planned_qty, w.received_qty, w.status, w.wo_type,
        w.from_store, w.to_store,
        (w.planned_qty - w.received_qty) as wip_qty,
        b.bom_code, b.output_sku,
        p.description as product_name
      FROM work_order_header w
      JOIN bom_header b ON w.bom_id = b.id
      JOIN product_master p ON b.output_sku = p.sku_code
      ORDER BY w.wo_date DESC
    `);
    
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getWorkOrder = async (req, res) => {
  try {
    const woId = req.params.id;
    const { rows: headerRows } = await query(`
      SELECT 
        w.id, w.wo_number, w.bom_id, w.wo_date,
        w.planned_qty, w.received_qty, w.status, w.wo_type,
        w.from_store, w.to_store,
        (w.planned_qty - w.received_qty) as wip_qty,
        b.bom_code, b.output_sku,
        p.description as product_name
      FROM work_order_header w
      JOIN bom_header b ON w.bom_id = b.id
      JOIN product_master p ON b.output_sku = p.sku_code
      WHERE w.id = $1
    `, [woId]);

    if (headerRows.length === 0) return res.status(404).json({ message: 'Work Order not found' });

    const wo = headerRows[0];

    const { rows: lineRows } = await query(`
      SELECT 
        bl.input_sku, pm.description, 
        bl.consume_qty, bl.uom, bl.rate_at_bom,
        (bl.consume_qty * $2) as total_qty,
        (bl.consume_qty * bl.rate_at_bom * $2) as total_value
      FROM bom_lines bl
      JOIN product_master pm ON bl.input_sku = pm.sku_code
      WHERE bl.bom_id = $1
    `, [wo.bom_id, wo.planned_qty]);

    return res.status(200).json({ success: true, data: { ...wo, lines: lineRows } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createWorkOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { bom_id, wo_date, planned_qty, wo_type, from_store, to_store } = req.body;

    // Generate wo_number
    const numRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(wo_number FROM 4) AS INTEGER)), 0) + 1 AS next_num FROM work_order_header`
    );
    const wo_number = `WO-${String(numRes.rows[0].next_num).padStart(4, '0')}`;

    const { rows } = await client.query(`
      INSERT INTO work_order_header 
      (wo_number, bom_id, wo_date, planned_qty, received_qty, status, wo_type, from_store, to_store)
      VALUES ($1, $2, $3, $4, 0, 'ISSUED', $5, $6, $7)
      RETURNING *
    `, [wo_number, bom_id, wo_date || new Date().toISOString().slice(0, 10), planned_qty, wo_type, from_store, to_store]);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

const receiveWorkOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const woId = req.params.id;
    const { received_qty, receipt_date, remarks, from_store, to_store } = req.body;

    // ── 1. Load WO + BOM + product info ─────────────────────────────────────
    const { rows: woRows } = await client.query(`
      SELECT
        w.id, w.wo_number, w.bom_id, w.planned_qty, w.received_qty, w.status,
        b.output_sku, b.output_uom,
        p.description AS product_name
      FROM work_order_header w
      JOIN bom_header     b  ON w.bom_id      = b.id
      JOIN product_master p  ON b.output_sku  = p.sku_code
      WHERE w.id = $1 FOR UPDATE
    `, [woId]);

    if (woRows.length === 0) throw new Error('Work Order not found');
    const wo        = woRows[0];
    const rcvDate   = receipt_date || new Date().toISOString().slice(0, 10);
    const rcvQty    = parseFloat(received_qty);
    const totalRcv  = parseFloat(wo.received_qty) + rcvQty;

    // ── 2. Insert receipt line ───────────────────────────────────────────────
    await client.query(`
      INSERT INTO wo_receipt_lines (wo_id, received_qty, receipt_date, remarks)
      VALUES ($1, $2, $3, $4)
    `, [woId, rcvQty, rcvDate, remarks || null]);

    // ── 3. Update WO header ──────────────────────────────────────────────────
    await client.query(`
      UPDATE work_order_header
      SET received_qty = $1,
          status = CASE WHEN $1 >= planned_qty THEN 'RECEIVED' ELSE 'PARTIAL' END::wo_status_enum,
          to_store   = COALESCE($3, to_store),
          from_store = COALESCE($4, from_store)
      WHERE id = $2
    `, [totalRcv, woId, to_store || null, from_store || null]);

    // ── 4. Credit output SKU into stock_summary (WO_RECEIPT) ─────────────────
    await client.query(`
      INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
      VALUES ($1, $2, $3, $4, 0, 0, NOW())
      ON CONFLICT (sku_code) DO UPDATE
        SET current_qty  = stock_summary.current_qty + EXCLUDED.current_qty,
            last_updated = NOW()
    `, [wo.output_sku, wo.product_name, wo.output_uom || 'PCS', rcvQty]);

    const { rows: fgBal } = await client.query(
      'SELECT current_qty FROM stock_summary WHERE sku_code = $1', [wo.output_sku]
    );
    const fgBalance = parseFloat(fgBal[0]?.current_qty || 0);

    await client.query(`
      INSERT INTO stock_ledger
        (transaction_date, sku_code, sku_description, uom,
         transaction_type, reference_no, reference_type,
         qty_in, qty_out, rate, value_in, value_out,
         running_balance, running_value, remarks)
      VALUES ($1, $2, $3, $4, 'WO_RECEIPT', $5, 'WO', $6, 0, 0, 0, 0, $7, 0, $8)
    `, [rcvDate, wo.output_sku, wo.product_name, wo.output_uom || 'PCS',
        wo.wo_number, rcvQty, fgBalance, remarks || `WO Receipt: ${wo.wo_number}`]);

    // ── 5. Deduct each BOM component from stock_summary (WO_ISSUE) ───────────
    const { rows: bomLines } = await client.query(`
      SELECT bl.input_sku, bl.consume_qty, bl.uom, bl.rate_at_bom,
             pm.description
      FROM   bom_lines      bl
      JOIN   product_master pm ON bl.input_sku = pm.sku_code
      WHERE  bl.bom_id = $1
    `, [wo.bom_id]);

    for (const line of bomLines) {
      const consumeQty  = parseFloat(line.consume_qty) * rcvQty;
      const issueValue  = consumeQty * parseFloat(line.rate_at_bom || 0);

      // Deduct from stock_summary (INSERT 0 so row exists, then subtract)
      await client.query(`
        INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
        VALUES ($1, $2, $3, 0, 0, 0, NOW())
        ON CONFLICT (sku_code) DO UPDATE
          SET current_qty   = stock_summary.current_qty   - $4,
              current_value = GREATEST(stock_summary.current_value - $5, 0),
              last_updated  = NOW()
      `, [line.input_sku, line.description, line.uom, consumeQty, issueValue]);

      const { rows: compBal } = await client.query(
        'SELECT current_qty, current_value FROM stock_summary WHERE sku_code = $1', [line.input_sku]
      );
      const compRunBal = parseFloat(compBal[0]?.current_qty  || 0);
      const compRunVal = parseFloat(compBal[0]?.current_value || 0);

      await client.query(`
        INSERT INTO stock_ledger
          (transaction_date, sku_code, sku_description, uom,
           transaction_type, reference_no, reference_type,
           qty_in, qty_out, rate, value_in, value_out,
           running_balance, running_value, remarks)
        VALUES ($1, $2, $3, $4, 'WO_ISSUE', $5, 'WO', 0, $6, $7, 0, $8, $9, $10, $11)
      `, [rcvDate, line.input_sku, line.description, line.uom,
          wo.wo_number, consumeQty, parseFloat(line.rate_at_bom || 0),
          issueValue, compRunBal, compRunVal,
          `WO Issue: ${wo.wo_number}`]);
    }

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      message: `Work Order received. Stock updated (${bomLines.length} components deducted).`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

const getWipSummary = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_wip_orders,
        COALESCE(SUM(planned_qty - received_qty), 0) as total_wip_qty,
        COUNT(CASE WHEN wo_type = 'RM_TO_SF' THEN 1 END) as rm_to_sf,
        COUNT(CASE WHEN wo_type = 'SF_TO_FG' THEN 1 END) as sf_to_fg,
        COUNT(CASE WHEN wo_type = 'RM_TO_FG' THEN 1 END) as rm_to_fg
      FROM work_order_header
      WHERE planned_qty > received_qty
    `)
    res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getWip = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        w.id, w.wo_number, w.wo_date, w.wo_type,
        w.planned_qty, w.received_qty,
        (w.planned_qty - w.received_qty) as wip_qty,
        w.status, w.from_store, w.to_store,
        b.bom_code, b.output_sku,
        p.description as product_name,
        NOW()::date - w.wo_date as age_days
      FROM work_order_header w
      JOIN bom_header b ON w.bom_id = b.id
      JOIN product_master p ON b.output_sku = p.sku_code
      WHERE w.planned_qty > w.received_qty
      ORDER BY w.wo_date ASC
    `)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const deleteWorkOrder = async (req, res) => {
  try {
    const { id } = req.params
    const check = await query(
      `SELECT status FROM work_order_header WHERE id = $1`, [id]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ message: 'Work order not found' })
    }
    if (!['DRAFT','ISSUED'].includes(check.rows[0].status)) {
      return res.status(400).json({ 
        message: 'Cannot delete WO with status: ' + check.rows[0].status 
      })
    }
    await query(`DELETE FROM work_order_header WHERE id = $1`, [id])
    res.json({ success: true, message: 'Work order deleted' })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

module.exports = {
  listWorkOrders,
  getWorkOrder,
  createWorkOrder,
  receiveWorkOrder,
  deleteWorkOrder,
  getWip,
  getWipSummary
};
