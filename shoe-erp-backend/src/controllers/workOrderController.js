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
    const { received_qty, receipt_date, remarks } = req.body;

    const { rows: woRows } = await client.query(`SELECT planned_qty, received_qty FROM work_order_header WHERE id = $1 FOR UPDATE`, [woId]);
    if (woRows.length === 0) throw new Error('Work Order not found');

    const totalRcv = parseFloat(woRows[0].received_qty) + parseFloat(received_qty);

    await client.query(`
      INSERT INTO wo_receipt_lines (wo_id, received_qty, receipt_date, remarks)
      VALUES ($1, $2, $3, $4)
    `, [woId, received_qty, receipt_date || new Date().toISOString().slice(0, 10), remarks]);

    await client.query(`
      UPDATE work_order_header 
      SET received_qty = $1, status = CASE WHEN $1 >= planned_qty THEN 'RECEIVED' ELSE 'PARTIAL' END::wo_status_enum
      WHERE id = $2
    `, [totalRcv, woId]);

    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Work Order received' });
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
