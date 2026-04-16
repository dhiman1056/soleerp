'use strict';

const { query, pool } = require('../config/db');

// ── Helpers ────────────────────────────────────────────────────────
const genGRNNo = async (client) => {
  const { rows } = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(grn_no FROM 5) AS INTEGER)), 0) + 1 AS n
    FROM po_receipts WHERE grn_no ~ '^GRN-[0-9]+$'
  `);
  return `GRN-${String(rows[0].n).padStart(4, '0')}`;
};

const genPRNNo = async (client) => {
  const { rows } = await client.query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(prn_no FROM 5) AS INTEGER)), 0) + 1 AS n
    FROM purchase_returns WHERE prn_no ~ '^PRN-[0-9]+$'
  `);
  return `PRN-${String(rows[0].n).padStart(4, '0')}`;
};

// Helper: upsert stock_summary + insert stock_ledger (credit)
async function creditStock(client, { skuCode, skuDesc, uom, qty, rate, txDate, refNo, refType, remarks }) {
  const value = qty * rate;

  await client.query(`
    INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (sku_code) DO UPDATE SET
      current_qty   = stock_summary.current_qty   + EXCLUDED.current_qty,
      current_value = stock_summary.current_value + EXCLUDED.current_value,
      avg_rate      = CASE
        WHEN (stock_summary.current_qty + EXCLUDED.current_qty) = 0 THEN 0
        ELSE (stock_summary.current_value + EXCLUDED.current_value)
             / (stock_summary.current_qty + EXCLUDED.current_qty)
      END,
      last_updated  = NOW()
  `, [skuCode, skuDesc, uom, qty, value, rate]);

  const { rows: bal } = await client.query(
    'SELECT current_qty, current_value FROM stock_summary WHERE sku_code = $1', [skuCode]
  );

  await client.query(`
    INSERT INTO stock_ledger
      (transaction_date, sku_code, sku_description, uom,
       transaction_type, reference_no, reference_type,
       qty_in, qty_out, rate, value_in, value_out,
       running_balance, running_value, remarks)
    VALUES ($1,$2,$3,$4,'PURCHASE',$5,$6,$7,0,$8,$9,0,$10,$11,$12)
  `, [
    txDate, skuCode, skuDesc, uom,
    refNo, refType || 'GRN',
    qty, rate, value,
    parseFloat(bal[0].current_qty),
    parseFloat(bal[0].current_value),
    remarks || `GRN: ${refNo}`,
  ]);
}

// Helper: debit stock_summary + insert stock_ledger (debit = return)
async function debitStock(client, { skuCode, skuDesc, uom, qty, rate, txDate, refNo, refType, remarks }) {
  const value = qty * rate;

  await client.query(`
    UPDATE stock_summary
    SET current_qty   = current_qty   - $1,
        current_value = GREATEST(current_value - $2, 0),
        avg_rate      = CASE WHEN (current_qty - $1) <= 0 THEN 0
                             ELSE GREATEST(current_value - $2, 0) / (current_qty - $1) END,
        last_updated  = NOW()
    WHERE sku_code = $3
  `, [qty, value, skuCode]);

  const { rows: bal } = await client.query(
    'SELECT COALESCE(current_qty,0) AS current_qty, COALESCE(current_value,0) AS current_value FROM stock_summary WHERE sku_code = $1',
    [skuCode]
  );

  await client.query(`
    INSERT INTO stock_ledger
      (transaction_date, sku_code, sku_description, uom,
       transaction_type, reference_no, reference_type,
       qty_in, qty_out, rate, value_in, value_out,
       running_balance, running_value, remarks)
    VALUES ($1,$2,$3,$4,'PURCHASE_RETURN',$5,$6,0,$7,$8,0,$9,$10,$11,$12)
  `, [
    txDate, skuCode, skuDesc, uom,
    refNo, refType || 'PRN',
    qty, rate, value,
    parseFloat(bal[0]?.current_qty || 0),
    parseFloat(bal[0]?.current_value || 0),
    remarks || `PRN: ${refNo}`,
  ]);
}

// ─── GET /api/purchase-orders ──────────────────────────────────────
const getAllPurchaseOrders = async (req, res) => {
  try {
    const { status, supplier_id } = req.query;
    const conditions = [];
    const params     = [];

    if (status) { params.push(status.toUpperCase()); conditions.push(`po.status = $${params.length}`); }
    if (supplier_id) { params.push(supplier_id); conditions.push(`po.supplier_id = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(`
      SELECT
        po.*,
        s.supplier_name AS supplier_display,
        (SELECT COUNT(*) FROM po_lines WHERE po_id = po.id) AS line_count
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ${where}
      ORDER BY po.po_date DESC, po.id DESC
    `, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id ─────────────────────────────────
const getPurchaseOrderById = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT po.*, s.supplier_name,
        COALESCE(json_agg(json_build_object(
          'id', l.id, 'line_no', l.line_no,
          'sku_code', l.sku_code, 'sku_description', l.sku_description,
          'uom', l.uom,
          'ordered_qty', l.ordered_qty, 'received_qty', l.received_qty,
          'pending_qty', l.pending_qty, 'rate', l.rate, 'line_value', l.line_value
        ) ORDER BY l.line_no) FILTER (WHERE l.id IS NOT NULL), '[]') as lines
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN po_lines l  ON l.po_id = po.id
      WHERE po.id = $1
      GROUP BY po.id, s.supplier_name
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'PO not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/purchase-orders ─────────────────────────────────────
const createPurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { po_date, supplier_id, expected_delivery_date, remarks, lines } = req.body;

    const numRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(po_no FROM 4) AS INTEGER)), 0) + 1 AS next_num FROM purchase_orders`
    );
    const po_no = `PO-${String(numRes.rows[0].next_num).padStart(4, '0')}`;

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
        const l   = lines[i];
        const lv  = parseFloat(l.ordered_qty) * parseFloat(l.rate);
        await client.query(`
          INSERT INTO po_lines (po_id, line_no, sku_code, sku_description, uom, ordered_qty, received_qty, pending_qty, rate, line_value)
          VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
        `, [poId, i + 1, l.sku_code, l.sku_description || '', l.uom, l.ordered_qty, l.ordered_qty, l.rate, lv]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: poRow[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally { client.release(); }
};

// ─── PUT /api/purchase-orders/:id ─────────────────────────────────
const updatePurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { po_date, expected_delivery_date, remarks, lines } = req.body;

    const { rows: existing } = await client.query('SELECT id, status FROM purchase_orders WHERE id = $1', [id]);
    if (existing.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ success: false, message: 'PO not found' }); }
    if (existing[0].status !== 'DRAFT') { await client.query('ROLLBACK'); return res.status(400).json({ success: false, message: `Only DRAFT POs are editable.` }); }

    let total_value = 0;
    (lines || []).forEach(l => { total_value += parseFloat(l.ordered_qty) * parseFloat(l.rate); });

    const { rows: poRow } = await client.query(`
      UPDATE purchase_orders
      SET    po_date = COALESCE($1, po_date),
             expected_delivery_date = COALESCE($2, expected_delivery_date),
             remarks = $3, total_value = $4
      WHERE  id = $5
      RETURNING *
    `, [po_date, expected_delivery_date, remarks || null, total_value, id]);

    if (lines !== undefined) {
      await client.query('DELETE FROM po_lines WHERE po_id = $1', [id]);
      for (let i = 0; i < (lines || []).length; i++) {
        const l  = lines[i];
        const lv = parseFloat(l.ordered_qty) * parseFloat(l.rate);
        await client.query(`
          INSERT INTO po_lines (po_id, line_no, sku_code, sku_description, uom, ordered_qty, received_qty, pending_qty, rate, line_value)
          VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9)
        `, [id, i + 1, l.sku_code, l.sku_description || '', l.uom, l.ordered_qty, l.ordered_qty, l.rate, lv]);
      }
    }

    await client.query('COMMIT');
    return res.json({ success: true, data: poRow[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally { client.release(); }
};

// ─── PUT /api/purchase-orders/:id/send ────────────────────────────
const sendPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE purchase_orders SET status = 'SENT' WHERE id = $1 AND status = 'DRAFT' RETURNING *
    `, [id]);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'PO not found or not in DRAFT status.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/purchase-orders/:id/cancel ──────────────────────────
const cancelPurchaseOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`
      UPDATE purchase_orders SET status = 'CANCELLED'
      WHERE id = $1 AND status IN ('DRAFT', 'SENT') RETURNING *
    `, [id]);
    if (rows.length === 0) return res.status(400).json({ success: false, message: 'PO not found or cannot be cancelled.' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id/receipts ────────────────────────
const getPOReceipts = async (req, res) => {
  try {
    const { id } = req.params;
    const { rows: poCheck } = await query('SELECT id FROM purchase_orders WHERE id = $1', [id]);
    if (poCheck.length === 0) return res.status(404).json({ success: false, message: 'PO not found' });

    // GRN receipts with lines
    const { rows: receipts } = await query(`
      SELECT r.*,
        COALESCE(json_agg(json_build_object(
          'id', rl.id, 'sku_code', rl.sku_code, 'received_qty', rl.received_qty,
          'rate', rl.rate, 'value', rl.value
        )) FILTER (WHERE rl.id IS NOT NULL), '[]') AS lines
      FROM po_receipts r
      LEFT JOIN po_receipt_lines rl ON rl.grn_id = r.id
      WHERE r.po_id = $1
      GROUP BY r.id
      ORDER BY r.id
    `, [id]);

    return res.json({ success: true, data: receipts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/purchase-orders/:id/receive (GRN against PO) ───────
const receivePurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { grn_date, receipt_date, challan_no, remarks, lines } = req.body;

    if (!lines || lines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'lines array is required' });
    }

    const { rows: poRows } = await client.query(
      `SELECT id, po_no, supplier_id, status FROM purchase_orders WHERE id = $1 FOR UPDATE`, [id]
    );
    if (poRows.length === 0) throw new Error('PO not found');
    if (!['SENT', 'PARTIAL', 'DRAFT'].includes(poRows[0].status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Cannot receive against PO in '${poRows[0].status}' status.` });
    }

    const rcvDate = grn_date || receipt_date || new Date().toISOString().slice(0, 10);
    const grn_no  = await genGRNNo(client);

    // Insert GRN header
    const { rows: grnRow } = await client.query(`
      INSERT INTO po_receipts (grn_no, grn_date, po_id, po_no, supplier_id, challan_no, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [grn_no, rcvDate, id, poRows[0].po_no, poRows[0].supplier_id, challan_no || null, remarks || null]);

    const grnId = grnRow[0].id;

    for (const item of lines) {
      const rcvQty = parseFloat(item.received_qty || item.receive_qty);
      if (!rcvQty || rcvQty <= 0) continue;

      // Use line_id (from POReceiveModal) or po_line_id
      const lineId = item.line_id || item.po_line_id;

      const { rows: lineRows } = await client.query(
        `SELECT id, sku_code, sku_description, uom, rate, ordered_qty, received_qty, pending_qty
         FROM po_lines WHERE id = $1 AND po_id = $2 FOR UPDATE`,
        [lineId, id]
      );
      if (lineRows.length === 0) continue;

      const line        = lineRows[0];
      const lineRate    = parseFloat(item.rate || line.rate);
      const newReceived = parseFloat(line.received_qty) + rcvQty;
      const newPending  = Math.max(0, parseFloat(line.ordered_qty) - newReceived);

      await client.query(`UPDATE po_lines SET received_qty=$1, pending_qty=$2 WHERE id=$3`, [newReceived, newPending, line.id]);

      // Insert GRN receipt line
      await client.query(`
        INSERT INTO po_receipt_lines (grn_id, po_line_id, sku_code, received_qty, rate, value)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [grnId, line.id, line.sku_code, rcvQty, lineRate, rcvQty * lineRate]);

      // Update stock
      await creditStock(client, {
        skuCode: line.sku_code, skuDesc: line.sku_description, uom: line.uom,
        qty: rcvQty, rate: lineRate, txDate: rcvDate,
        refNo: grn_no, refType: 'GRN',
        remarks: remarks || `GRN ${grn_no} against ${poRows[0].po_no}`,
      });
    }

    // Recalculate PO status
    const { rows: ls } = await client.query(`SELECT SUM(pending_qty) as total_pending FROM po_lines WHERE po_id = $1`, [id]);
    const newStatus = parseFloat(ls[0].total_pending) <= 0 ? 'RECEIVED' : 'PARTIAL';
    await client.query(`UPDATE purchase_orders SET status=$1 WHERE id=$2`, [newStatus, id]);

    await client.query('COMMIT');
    return res.json({ success: true, message: `GRN ${grn_no} recorded. PO status: ${newStatus}`, data: { grn_no } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally { client.release(); }
};

// ─── POST /api/purchase-orders/grn/direct (GRN without PO) ────────
const directGRN = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { supplier_id, grn_date, challan_no, remarks, lines } = req.body;

    if (!lines || lines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'lines array is required' });
    }

    const rcvDate = grn_date || new Date().toISOString().slice(0, 10);
    const grn_no  = await genGRNNo(client);

    const { rows: grnRow } = await client.query(`
      INSERT INTO po_receipts (grn_no, grn_date, po_id, po_no, supplier_id, challan_no, remarks)
      VALUES ($1, $2, NULL, NULL, $3, $4, $5)
      RETURNING id
    `, [grn_no, rcvDate, supplier_id || null, challan_no || null, remarks || null]);

    const grnId = grnRow[0].id;

    for (const item of lines) {
      const rcvQty = parseFloat(item.received_qty);
      const rate   = parseFloat(item.rate) || 0;
      if (!rcvQty || rcvQty <= 0) continue;

      // Resolve description and UOM if not provided
      let skuDesc = item.sku_description || '';
      let uom     = item.uom || 'PCS';
      if (!skuDesc) {
        const { rows: pm } = await client.query('SELECT description, uom FROM product_master WHERE sku_code=$1', [item.sku_code]);
        if (pm.length) { skuDesc = pm[0].description; uom = pm[0].uom; }
      }

      await client.query(`
        INSERT INTO po_receipt_lines (grn_id, po_line_id, sku_code, received_qty, rate, value)
        VALUES ($1, NULL, $2, $3, $4, $5)
      `, [grnId, item.sku_code, rcvQty, rate, rcvQty * rate]);

      await creditStock(client, {
        skuCode: item.sku_code, skuDesc, uom,
        qty: rcvQty, rate, txDate: rcvDate,
        refNo: grn_no, refType: 'DIRECT_GRN',
        remarks: remarks || `Direct GRN ${grn_no}`,
      });
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, message: `Direct GRN ${grn_no} recorded.`, data: { grn_no } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally { client.release(); }
};

// ─── POST /api/purchase-orders/prn (Purchase Return Note) ─────────
const createPRN = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { supplier_id, supplier_name, grn_no: refGrn, prn_date, remarks, lines } = req.body;

    if (!lines || lines.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'lines array is required' });
    }

    const prn_no    = await genPRNNo(client);
    const prnDate   = prn_date || new Date().toISOString().slice(0, 10);
    let   totalVal  = 0;

    for (const l of lines) {
      totalVal += (parseFloat(l.return_qty) || 0) * (parseFloat(l.rate) || 0);
    }

    // Resolve supplier_name if not provided
    let sup_name = supplier_name;
    if (!sup_name && supplier_id) {
      const { rows: sr } = await client.query('SELECT supplier_name FROM suppliers WHERE id=$1', [supplier_id]);
      if (sr.length) sup_name = sr[0].supplier_name;
    }

    const { rows: prnRow } = await client.query(`
      INSERT INTO purchase_returns (prn_no, prn_date, grn_no, supplier_id, supplier_name, total_value, remarks)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [prn_no, prnDate, refGrn || null, supplier_id || null, sup_name || null, totalVal, remarks || null]);

    const prnId = prnRow[0].id;

    for (const line of lines) {
      const retQty  = parseFloat(line.return_qty);
      const rate    = parseFloat(line.rate) || 0;
      if (!retQty || retQty <= 0) continue;

      let desc = line.sku_description || '';
      let uom  = line.uom || 'PCS';
      if (!desc) {
        const { rows: pm } = await client.query('SELECT description, uom FROM product_master WHERE sku_code=$1', [line.sku_code]);
        if (pm.length) { desc = pm[0].description; uom = pm[0].uom; }
      }

      await client.query(`
        INSERT INTO purchase_return_lines (prn_id, sku_code, sku_description, uom, return_qty, rate, value, reason)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [prnId, line.sku_code, desc, uom, retQty, rate, retQty * rate, line.reason || null]);

      await debitStock(client, {
        skuCode: line.sku_code, skuDesc: desc, uom,
        qty: retQty, rate, txDate: prnDate,
        refNo: prn_no, refType: 'PRN',
        remarks: remarks || `Purchase Return ${prn_no}`,
      });
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, message: `PRN ${prn_no} recorded. Total: ₹${totalVal.toFixed(2)}`, data: { prn_no } });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally { client.release(); }
};

// ─── GET /api/purchase-orders/grn (all GRNs) ──────────────────────
const getGRNList = async (req, res) => {
  try {
    const { from_date, to_date, supplier_id } = req.query;
    const conditions = ['1=1'];
    const params     = [];

    if (from_date)   { params.push(from_date);   conditions.push(`r.grn_date >= $${params.length}`); }
    if (to_date)     { params.push(to_date);     conditions.push(`r.grn_date <= $${params.length}`); }
    if (supplier_id) { params.push(supplier_id); conditions.push(`r.supplier_id = $${params.length}`); }

    const { rows } = await query(`
      SELECT r.*, s.supplier_name,
        COALESCE((SELECT SUM(value) FROM po_receipt_lines WHERE grn_id = r.id), 0) AS total_value,
        COALESCE((SELECT COUNT(*) FROM po_receipt_lines WHERE grn_id = r.id), 0) AS line_count
      FROM po_receipts r
      LEFT JOIN suppliers s ON r.supplier_id = s.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY r.grn_date DESC, r.id DESC
    `, params);

    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/purchase-orders/prn (all PRNs) ──────────────────────
const getPRNList = async (req, res) => {
  try {
    const { from_date, to_date, supplier_id } = req.query;
    const conditions = ['1=1'];
    const params     = [];

    if (from_date)   { params.push(from_date);   conditions.push(`p.prn_date >= $${params.length}`); }
    if (to_date)     { params.push(to_date);     conditions.push(`p.prn_date <= $${params.length}`); }
    if (supplier_id) { params.push(supplier_id); conditions.push(`p.supplier_id = $${params.length}`); }

    const { rows } = await query(`
      SELECT p.*
      FROM purchase_returns p
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.prn_date DESC, p.id DESC
    `, params);

    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/purchase-orders/:id/receipts (compat alias) ─────────
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
  directGRN,
  createPRN,
  getGRNList,
  getPRNList,
  getGRNDetail,
};
