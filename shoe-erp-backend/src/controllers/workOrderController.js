'use strict';

const { query, pool } = require('../config/db');

const listWorkOrders = async (req, res) => {
  try {
    const { status, wo_type, search } = req.query;

    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`w.status = $${params.length}`);
    }

    if (wo_type) {
      params.push(wo_type);
      conditions.push(`w.wo_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(w.wo_number ILIKE $${params.length} OR pm.description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(`
      SELECT
        w.id, w.wo_number, w.wo_date, w.planned_qty,
        w.received_qty, w.status, w.wo_type,
        w.from_store, w.to_store,
        (w.planned_qty - w.received_qty) AS wip_qty,
        fl.location_name AS from_location_name,
        tl.location_name AS to_location_name,
        bh.bom_code, bh.output_sku,
        pm.description AS product_name,
        COALESCE(
          json_agg(
            json_build_object(
              'bom_id',      wbl.bom_id,
              'bom_code',    wbl.bom_code,
              'output_sku',  wbl.output_sku,
              'planned_qty', wbl.planned_qty,
              'received_qty',wbl.received_qty,
              'status',      wbl.status,
              'product_name', pm2.description
            )
          ) FILTER (WHERE wbl.id IS NOT NULL),
          '[]'
        ) AS bom_lines
      FROM work_order_header w
      LEFT JOIN bom_header     bh  ON w.bom_id           = bh.id
      LEFT JOIN product_master pm  ON bh.output_sku      = pm.sku_code
      LEFT JOIN location_master fl ON w.from_location_id = fl.id
      LEFT JOIN location_master tl ON w.to_location_id   = tl.id
      LEFT JOIN work_order_bom_lines wbl ON wbl.wo_id    = w.id
      LEFT JOIN bom_header     bh2 ON wbl.bom_id         = bh2.id
      LEFT JOIN product_master pm2 ON bh2.output_sku     = pm2.sku_code
      ${whereClause}
      GROUP BY w.id, bh.bom_code, bh.output_sku, pm.description,
               fl.location_name, tl.location_name
      ORDER BY w.wo_date DESC, w.id DESC
    `, params);

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

    const { rows: breakupRows } = await query(`
      SELECT size_code, planned_qty, received_qty
      FROM wo_size_breakup
      WHERE wo_id = $1
      ORDER BY size_code
    `, [woId]);

    return res.status(200).json({ success: true, data: { ...wo, lines: lineRows, size_breakup: breakupRows } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createWorkOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const {
      boms,              // NEW: [{ bom_id, planned_qty }]
      bom_id,            // LEGACY: single BOM
      wo_date,
      planned_qty,       // LEGACY: single total qty
      wo_type,
      from_store,
      to_store,
      from_location_id,
      to_location_id,
      notes,
      sizeBreakup,
    } = req.body;

    // Build canonical boms array (merge legacy + new)
    const bomsArray = Array.isArray(boms) && boms.length > 0
      ? boms
      : bom_id ? [{ bom_id: parseInt(bom_id), planned_qty: parseFloat(planned_qty) || 0 }]
      : [];

    if (bomsArray.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'At least one BOM is required (use boms[] or bom_id)' });
    }

    // Validate wo_type
    const VALID_TYPES = ['RM_TO_SF', 'SF_TO_FG'];
    if (!VALID_TYPES.includes((wo_type || '').toUpperCase())) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `wo_type must be one of: ${VALID_TYPES.join(', ')}` });
    }

    const totalPlannedQty = bomsArray.reduce((s, b) => s + parseFloat(b.planned_qty || 0), 0);
    if (totalPlannedQty <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Total planned_qty must be > 0' });
    }

    // Generate type-based WO number
    const getWOPrefix = (type) => {
      if (type === 'RM_TO_SF') return 'SFWO'
      if (type === 'SF_TO_FG') return 'FGWO'
      if (type === 'RM_TO_FG') return 'FGWO'
      return 'WO'
    }
    const woPrefix = getWOPrefix((wo_type || '').toUpperCase())
    const numRes = await client.query(
      `SELECT COALESCE(MAX(
         CAST(SUBSTRING(wo_number FROM LENGTH($1)+2) AS INTEGER)
       ), 0) + 1 AS next_num
       FROM work_order_header
       WHERE wo_number LIKE $2`,
      [woPrefix, `${woPrefix}-%`]
    );
    const wo_number = `${woPrefix}-${String(numRes.rows[0].next_num).padStart(4, '0')}`;

    // Primary bom_id for backward-compat header column
    const primaryBomId = bomsArray[0]?.bom_id || null;

    const { rows } = await client.query(`
      INSERT INTO work_order_header
        (wo_number, bom_id, wo_date, planned_qty, received_qty,
         status, wo_type, from_store, to_store, from_location_id, to_location_id)
      VALUES ($1, $2, $3, $4, 0, 'ISSUED', $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      wo_number,
      primaryBomId,
      wo_date || new Date().toISOString().slice(0, 10),
      totalPlannedQty,
      wo_type.toUpperCase(),
      from_store  || null,
      to_store    || null,
      from_location_id ? parseInt(from_location_id) : null,
      to_location_id   ? parseInt(to_location_id)   : null,
    ]);

    const woId = rows[0].id;

    // Insert work_order_bom_lines (one per BOM)
    for (const bomLine of bomsArray) {
      const { rows: bomRows } = await client.query(
        'SELECT bom_code, output_sku FROM bom_header WHERE id = $1', [bomLine.bom_id]
      );
      if (!bomRows.length) {
        await client.query('ROLLBACK');
        return res.status(400).json({ success: false, message: `BOM id ${bomLine.bom_id} not found` });
      }
      await client.query(`
        INSERT INTO work_order_bom_lines (wo_id, bom_id, planned_qty, received_qty, bom_code, output_sku)
        VALUES ($1, $2, $3, 0, $4, $5)
      `, [woId, bomLine.bom_id, parseFloat(bomLine.planned_qty), bomRows[0].bom_code, bomRows[0].output_sku]);
    }

    const aggregatedSizes = {};
    for (const bomLine of bomsArray) {
      if (bomLine.size_breakup) {
        for (const [sizeCode, qty] of Object.entries(bomLine.size_breakup)) {
          aggregatedSizes[sizeCode] = (aggregatedSizes[sizeCode] || 0) + parseFloat(qty || 0);
        }
      }
    }
    for (const [sizeCode, qty] of Object.entries(aggregatedSizes)) {
      if (qty > 0) {
        await client.query(`
          INSERT INTO wo_size_breakup (wo_id, size_code, planned_qty, received_qty)
          VALUES ($1, $2, $3, 0)
        `, [woId, sizeCode, qty]);
      }
    }

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
    const {
      received_qty,
      rejection_qty = 0,
      receipt_date,
      remarks,
      from_store,
      to_store,
      from_location_id,
      to_location_id,
      size_receipts,
      total_received,
      total_rejected,
      total_good
    } = req.body;

    // ── 1. Load WO + BOM + product info ─────────────────────────────────────
    const { rows: woRows } = await client.query(`
      SELECT
        w.id, w.wo_number, w.bom_id, w.planned_qty, w.received_qty, w.status,
        w.wo_type,
        b.output_sku, b.output_uom,
        p.description AS product_name
      FROM work_order_header w
      JOIN bom_header     b  ON w.bom_id      = b.id
      JOIN product_master p  ON b.output_sku  = p.sku_code
      WHERE w.id = $1 FOR UPDATE
    `, [woId]);

    if (woRows.length === 0) throw new Error('Work Order not found');
    const wo      = woRows[0];
    const rcvDate = receipt_date || new Date().toISOString().slice(0, 10);

    // ── 1b. Generate receipt number (SFRCPT / FGRCPT) ────────────────────────
    const getReceiptPrefix = (type) => {
      if (type === 'RM_TO_SF') return 'SFRCPT'
      if (type === 'SF_TO_FG') return 'FGRCPT'
      if (type === 'RM_TO_FG') return 'FGRCPT'
      return 'RCPT'
    }
    const rcptPrefix = getReceiptPrefix(wo.wo_type || '')
    const rcptNumRes = await client.query(
      `SELECT COALESCE(MAX(
         CAST(SUBSTRING(receipt_no FROM LENGTH($1)+2) AS INTEGER)
       ), 0) + 1 AS next_num
       FROM wo_receipt_lines
       WHERE receipt_no LIKE $2`,
      [rcptPrefix, `${rcptPrefix}-%`]
    )
    const receipt_no = `${rcptPrefix}-${String(rcptNumRes.rows[0].next_num).padStart(4, '0')}`;
    const rcvQty  = parseFloat(total_received) || 0;
    const rejQty  = parseFloat(total_rejected) || 0;
    const goodQty = parseFloat(total_good) || Math.max(0, rcvQty - rejQty);
    const totalRcv = parseFloat(wo.received_qty) + rcvQty;

    // ── 2. Resolve to-location name for ledger tagging ───────────────────────
    let toLoc = null;
    if (to_location_id) {
      const { rows: locRows } = await client.query(
        'SELECT id, location_name FROM location_master WHERE id = $1', [to_location_id]
      );
      if (locRows.length > 0) toLoc = locRows[0];
    }
    let fromLoc = null;
    if (from_location_id) {
      const { rows: locRows } = await client.query(
        'SELECT id, location_name FROM location_master WHERE id = $1', [from_location_id]
      );
      if (locRows.length > 0) fromLoc = locRows[0];
    }

    // ── 3. Insert receipt line (with receipt_no, rejection & location info) ──
    const { rows: rcptRows } = await client.query(`
      INSERT INTO wo_receipt_lines
        (wo_id, receipt_no, received_qty, rejection_qty, receipt_date, remarks,
         from_location_id, to_location_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      woId, receipt_no, rcvQty, rejQty, rcvDate, remarks || null,
      from_location_id ? parseInt(from_location_id) : null,
      to_location_id   ? parseInt(to_location_id)   : null,
    ]);
    
    const receiptId = rcptRows[0].id;

    if (Array.isArray(size_receipts)) {
      for (const sr of size_receipts) {
        if (sr.receive_qty > 0 || sr.rejection_qty > 0) {
          await client.query(`
            INSERT INTO wo_size_receipts (receipt_id, wo_id, size_code, receive_qty, rejection_qty, rejection_reason)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [receiptId, woId, sr.size_code, sr.receive_qty, sr.rejection_qty, sr.rejection_reason]);

          await client.query(`
            UPDATE wo_size_breakup
            SET received_qty = received_qty + $1
            WHERE wo_id = $2 AND size_code = $3
          `, [sr.receive_qty, woId, sr.size_code]);
        }
      }
    }

    // ── 4. Update WO header ──────────────────────────────────────────────────
    await client.query(`
      UPDATE work_order_header
      SET received_qty = $1,
          status = CASE WHEN $1 >= planned_qty THEN 'RECEIVED' ELSE 'PARTIAL' END::wo_status_enum,
          to_store   = COALESCE($3, to_store),
          from_store = COALESCE($4, from_store),
          to_location_id   = COALESCE($5, to_location_id),
          from_location_id = COALESCE($6, from_location_id)
      WHERE id = $2
    `, [
      totalRcv, woId,
      to_store   || null, from_store   || null,
      to_location_id   ? parseInt(to_location_id)   : null,
      from_location_id ? parseInt(from_location_id) : null,
    ]);

    // ── 5. Credit GOOD qty of output SKU into stock_summary (WO_RECEIPT) ────
    if (goodQty > 0) {
      await client.query(`
        INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
        VALUES ($1, $2, $3, $4, 0, 0, NOW())
        ON CONFLICT (sku_code) DO UPDATE
          SET current_qty  = stock_summary.current_qty + EXCLUDED.current_qty,
              last_updated = NOW()
      `, [wo.output_sku, wo.product_name, wo.output_uom || 'PCS', goodQty]);

      const { rows: fgBal } = await client.query(
        'SELECT current_qty FROM stock_summary WHERE sku_code = $1', [wo.output_sku]
      );
      const fgBalance = parseFloat(fgBal[0]?.current_qty || 0);

      await client.query(`
        INSERT INTO stock_ledger
          (transaction_date, sku_code, sku_description, uom,
           transaction_type, reference_no, reference_type,
           qty_in, qty_out, rate, value_in, value_out,
           running_balance, running_value, remarks,
           location_id, location_name)
        VALUES ($1, $2, $3, $4, 'WO_RECEIPT', $5, 'WO', $6, 0, 0, 0, 0, $7, 0, $8, $9, $10)
      `, [
        rcvDate, wo.output_sku, wo.product_name, wo.output_uom || 'PCS',
        wo.wo_number, goodQty, fgBalance,
        remarks || `WO Receipt: ${wo.wo_number}`,
        toLoc?.id   || null,
        toLoc?.location_name || to_store || null,
      ]);
    }

    // ── 6. Deduct each BOM component from stock_summary (WO_ISSUE) ───────────
    // Component consumption is based on goodQty (rejected units still consumed materials)
    // Industry standard: deduct on full received_qty (rcvQty), not goodQty.
    // Change to goodQty below if you prefer "no deduction for rejected units".
    const { rows: bomLinesRows } = await client.query(`
      SELECT bl.input_sku, bl.consume_qty, bl.uom, bl.rate_at_bom,
             pm.description
      FROM   bom_lines      bl
      JOIN   product_master pm ON bl.input_sku = pm.sku_code
      WHERE  bl.bom_id = $1
    `, [wo.bom_id]);

    for (const line of bomLinesRows) {
      const consumeQty = parseFloat(line.consume_qty) * rcvQty;
      const issueValue = consumeQty * parseFloat(line.rate_at_bom || 0);

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
           running_balance, running_value, remarks,
           location_id, location_name)
        VALUES ($1, $2, $3, $4, 'WO_ISSUE', $5, 'WO', 0, $6, $7, 0, $8, $9, $10, $11, $12, $13)
      `, [
        rcvDate, line.input_sku, line.description, line.uom,
        wo.wo_number, consumeQty, parseFloat(line.rate_at_bom || 0),
        issueValue, compRunBal, compRunVal,
        `WO Issue: ${wo.wo_number}`,
        fromLoc?.id   || null,
        fromLoc?.location_name || from_store || null,
      ]);
    }

    await client.query('COMMIT');
    return res.status(200).json({
      success: true,
      message: `Work Order received. Receipt No: ${receipt_no}. Good qty: ${goodQty}, Rejected: ${rejQty}. Stock updated (${bomLinesRows.length} components deducted).`,
      data: { receipt_no, received_qty: rcvQty, rejection_qty: rejQty, good_qty: goodQty },
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
        p.size_chart as product_size_chart,
        NOW()::date - w.wo_date as age_days,
        COALESCE(SUM(rl.rejection_qty), 0) as total_rejection_qty
      FROM work_order_header w
      JOIN bom_header b ON w.bom_id = b.id
      JOIN product_master p ON b.output_sku = p.sku_code
      LEFT JOIN wo_receipt_lines rl ON rl.wo_id = w.id
      WHERE w.planned_qty > w.received_qty
      GROUP BY w.id, w.wo_number, w.wo_date, w.wo_type,
               w.planned_qty, w.received_qty, w.status, w.from_store, w.to_store,
               b.bom_code, b.output_sku, p.description, p.size_chart
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

const getWOSizeBreakup = async (req, res) => {
  try {
    const { id } = req.params
    const { rows } = await query(`
      SELECT 
        wsb.size_code, 
        wsb.planned_qty,
        COALESCE(SUM(wsr.receive_qty), 0) as received_qty
      FROM wo_size_breakup wsb
      LEFT JOIN wo_size_receipts wsr ON wsr.wo_id = wsb.wo_id 
        AND wsr.size_code = wsb.size_code
      WHERE wsb.wo_id = $1
      GROUP BY wsb.size_code, wsb.planned_qty
      ORDER BY wsb.size_code
    `, [id])
    
    res.json({ success: true, data: rows })
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
  getWipSummary,
  getWOSizeBreakup
};
