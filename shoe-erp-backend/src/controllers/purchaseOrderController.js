'use strict';

const { query, pool } = require('../config/db');

// ─── GET /api/purchase-orders ─────────────────────────────────────────────────
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const conditions = [];
    const params     = [];

    if (status) {
      params.push(status.toUpperCase());
      conditions.push(`po.status = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(`
      SELECT po.*, s.supplier_name as supplier
      FROM   purchase_orders po
      LEFT   JOIN suppliers s ON po.supplier_id = s.id
      ${where}
      ORDER  BY po.po_date DESC
    `, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id ────────────────────────────────────────────
const getPurchaseOrderById = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT po.*, s.supplier_name,
        COALESCE(json_agg(json_build_object(
          'id', l.id, 'line_no', l.line_no,
          'sku_code', l.sku_code, 'sku_description', l.sku_description,
          'uom', l.uom,
          'ordered_qty', l.ordered_qty, 'received_qty', l.received_qty,
          'pending_qty', l.pending_qty, 'rate', l.rate,
          'line_value', l.line_value
        ) ORDER BY l.line_no) FILTER (WHERE l.id IS NOT NULL), '[]') as lines
      FROM   purchase_orders po
      LEFT   JOIN suppliers s ON po.supplier_id = s.id
      LEFT   JOIN po_lines l  ON l.po_id = po.id
      WHERE  po.id = $1
      GROUP  BY po.id, s.supplier_name
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'PO not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/purchase-orders ────────────────────────────────────────────────
const createPurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { po_date, supplier_id, expected_delivery_date, remarks, lines } = req.body;

    // Auto-generate PO number
    const numRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(po_no FROM 4) AS INTEGER)), 0) + 1 AS next_num FROM purchase_orders`
    );
    const po_no = `PO-${String(numRes.rows[0].next_num).padStart(3, '0')}`;

    let total_value = 0;
    (lines || []).forEach(l => { total_value += parseFloat(l.ordered_qty) * parseFloat(l.rate); });

    const { rows: poRow } = await client.query(`
      INSERT INTO purchase_orders (
        po_no, po_date, supplier_id, supplier_name,
        expected_delivery_date, status, total_value, remarks
      ) VALUES (
        $1, $2, $3,
        (SELECT supplier_name FROM suppliers WHERE id = $3),
        $4, 'DRAFT', $5, $6
      ) RETURNING *
    `, [po_no, po_date, supplier_id, expected_delivery_date || null, total_value, remarks || null]);

    const poId = poRow[0].id;

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const line_value = parseFloat(l.ordered_qty) * parseFloat(l.rate);
        await client.query(`
          INSERT INTO po_lines (
            po_id, line_no, sku_code, sku_description, uom,
            ordered_qty, received_qty, pending_qty, rate, line_value
          ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
        `, [poId, i + 1, l.sku_code, l.sku_description, l.uom,
            l.ordered_qty, l.ordered_qty, l.rate, line_value]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: poRow[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── PUT /api/purchase-orders/:id ────────────────────────────────────────────
// Only DRAFT POs can be edited
const updatePurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { po_date, expected_delivery_date, remarks, lines } = req.body;

    // Check PO exists and is still editable
    const { rows: existing } = await client.query(
      'SELECT id, status FROM purchase_orders WHERE id = $1', [id]
    );
    if (existing.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'PO not found' });
    }
    if (existing[0].status !== 'DRAFT') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot edit PO in '${existing[0].status}' status. Only DRAFT POs are editable.`,
      });
    }

    // Recalculate total value
    let total_value = 0;
    (lines || []).forEach(l => { total_value += parseFloat(l.ordered_qty) * parseFloat(l.rate); });

    const { rows: poRow } = await client.query(`
      UPDATE purchase_orders
      SET    po_date = COALESCE($1, po_date),
             expected_delivery_date = COALESCE($2, expected_delivery_date),
             remarks = $3,
             total_value = $4
      WHERE  id = $5
      RETURNING *
    `, [po_date, expected_delivery_date, remarks || null, total_value, id]);

    // Replace lines
    if (lines !== undefined) {
      await client.query('DELETE FROM po_lines WHERE po_id = $1', [id]);
      for (let i = 0; i < (lines || []).length; i++) {
        const l = lines[i];
        const line_value = parseFloat(l.ordered_qty) * parseFloat(l.rate);
        await client.query(`
          INSERT INTO po_lines (
            po_id, line_no, sku_code, sku_description, uom,
            ordered_qty, received_qty, pending_qty, rate, line_value
          ) VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
        `, [id, i + 1, l.sku_code, l.sku_description, l.uom,
            l.ordered_qty, l.ordered_qty, l.rate, line_value]);
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: poRow[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── PUT /api/purchase-orders/:id/send ───────────────────────────────────────
// Transitions DRAFT → SENT
const sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE purchase_orders
      SET    status = 'SENT'
      WHERE  id = $1 AND status = 'DRAFT'
      RETURNING *
    `, [id]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'PO not found or not in DRAFT status.',
      });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/purchase-orders/:id/cancel ─────────────────────────────────────
const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE purchase_orders
      SET    status = 'CANCELLED'
      WHERE  id = $1 AND status IN ('DRAFT', 'SENT')
      RETURNING *
    `, [id]);

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'PO not found or cannot be cancelled (only DRAFT/SENT POs can be cancelled).',
      });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id/receipts ───────────────────────────────────
const getPOReceipts = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify PO exists
    const { rows: poCheck } = await query('SELECT id FROM purchase_orders WHERE id = $1', [id]);
    if (poCheck.length === 0) return res.status(404).json({ success: false, message: 'PO not found' });

    // Return the current received quantities per line
    const { rows } = await query(`
      SELECT l.id, l.line_no, l.sku_code, l.sku_description, l.uom,
             l.ordered_qty, l.received_qty, l.pending_qty, l.rate, l.line_value
      FROM   po_lines l
      WHERE  l.po_id = $1
      ORDER  BY l.line_no
    `, [id]);

    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/purchase-orders/:id/receive ───────────────────────────────────
// Partial or full GRN against a PO
const receivePurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { receipt_date, remarks, lines } = req.body;  // lines: [{ line_id, received_qty }]

    if (!lines || lines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'lines array is required' });
    }

    // Verify PO exists and is receivable
    const { rows: poRows } = await client.query(
      `SELECT id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`, [id]
    );
    if (poRows.length === 0) throw new Error('PO not found');
    if (!['SENT', 'PARTIAL'].includes(poRows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Cannot receive against PO in '${poRows[0].status}' status.`,
      });
    }

    const rcvDate = receipt_date || new Date().toISOString().slice(0, 10);

    for (const item of lines) {
      const rcvQty = parseFloat(item.received_qty);
      if (!rcvQty || rcvQty <= 0) continue;

      // Lock the line and update received/pending qtys
      const { rows: lineRows } = await client.query(
        `SELECT id, sku_code, sku_description, uom, rate, ordered_qty, received_qty, pending_qty
         FROM   po_lines WHERE id = $1 AND po_id = $2 FOR UPDATE`,
        [item.line_id, id]
      );
      if (lineRows.length === 0) continue;

      const line        = lineRows[0];
      const newReceived = parseFloat(line.received_qty) + rcvQty;
      const newPending  = Math.max(0, parseFloat(line.ordered_qty) - newReceived);

      await client.query(`
        UPDATE po_lines
        SET    received_qty = $1, pending_qty = $2
        WHERE  id = $3
      `, [newReceived, newPending, line.id]);

      // Credit stock_ledger
      const valueIn = rcvQty * parseFloat(line.rate)
      await client.query(`
        INSERT INTO stock_ledger (
          transaction_date, sku_code, sku_description, uom,
          transaction_type, reference_no, qty_in, qty_out, rate,
          value_in, value_out, remarks
        ) VALUES ($1, $2, $3, $4, 'PURCHASE', $5, $6, 0, $7, $8, 0, $9)
      `, [
        rcvDate,
        line.sku_code,
        line.sku_description,
        line.uom,
        `PO-RECV-${id}`,
        rcvQty,
        parseFloat(line.rate),
        valueIn,
        remarks || `GRN against PO #${id}`,
      ]);

      // Upsert stock_summary (weighted-average costing)
      await client.query(`
        INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (sku_code) DO UPDATE
        SET current_qty   = stock_summary.current_qty   + EXCLUDED.current_qty,
            current_value = stock_summary.current_value + EXCLUDED.current_value,
            avg_rate      = CASE
              WHEN (stock_summary.current_qty + EXCLUDED.current_qty) = 0 THEN 0
              ELSE (stock_summary.current_value + EXCLUDED.current_value)
                   / (stock_summary.current_qty + EXCLUDED.current_qty)
            END,
            last_updated  = NOW()
      `, [line.sku_code, line.sku_description, line.uom, rcvQty, valueIn, parseFloat(line.rate)]);
    }

    // Recalculate overall PO status
    const { rows: lineStatus } = await client.query(
      `SELECT SUM(pending_qty) as total_pending FROM po_lines WHERE po_id = $1`, [id]
    );
    const newPoStatus = parseFloat(lineStatus[0].total_pending) <= 0 ? 'RECEIVED' : 'PARTIAL';

    await client.query(
      `UPDATE purchase_orders SET status = $1 WHERE id = $2`, [newPoStatus, id]
    );

    await client.query('COMMIT');
    return res.json({ success: true, message: `Receipt recorded. PO status: ${newPoStatus}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── GET /api/purchase-orders/:id/receipts (alias kept for compat) ───────────
const getGRNDetail = async (req, res) => getPOReceipts(req, res);

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  getPOReceipts,
  receivePurchaseOrder,
  getGRNDetail,
};
