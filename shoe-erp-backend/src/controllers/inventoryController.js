'use strict';

const { query, getClient } = require('../config/db');
const { createError }      = require('../middleware/errorHandler');

// ── Helpers ────────────────────────────────────────────────────────
const generateReferenceNo = async (client, table, prefix) => {
  let seqColumn = '';
  if (table === 'purchases') seqColumn = 'purchase_no';
  else seqColumn = 'reference_no';
  
  const queryStr = table === 'purchases' 
    ? `SELECT COALESCE(MAX(CAST(SUBSTRING(${seqColumn} FROM 5) AS INTEGER)), 0) + 1 AS next_num FROM purchases`
    : `SELECT COALESCE(MAX(CAST(SUBSTRING(${seqColumn} FROM 5) AS INTEGER)), 0) + 1 AS next_num FROM stock_ledger WHERE transaction_type IN ('ADJUSTMENT_IN','ADJUSTMENT_OUT')`;

  const res = await client.query(queryStr);
  const num = res.rows[0].next_num;
  return `${prefix}-${String(num).padStart(4, '0')}`;
};

// ── Stock Summary ──────────────────────────────────────────────────
const getStockSummary = async (req, res, next) => {
  try {
    // We left join from product_master so ALL products show even if qty=0
    const stockRes = await query(`
      SELECT p.sku_code, p.description AS sku_description, p.uom,
             COALESCE(s.current_qty, 0) AS current_qty,
             COALESCE(s.avg_rate, p.rate, 0) AS avg_rate,
             COALESCE(s.current_value, 0) AS current_value,
             COALESCE(s.reorder_level, 0) AS reorder_level,
             CASE WHEN COALESCE(s.current_qty, 0) <= COALESCE(s.reorder_level, 0) AND COALESCE(s.reorder_level, 0) > 0 THEN true ELSE false END AS is_low_stock
      FROM product_master p
      LEFT JOIN stock_summary s ON s.sku_code = p.sku_code
      ORDER BY p.sku_code
    `);
    return res.status(200).json({ success: true, data: stockRes.rows });
  } catch (err) { next(err); }
};

const getStockSummaryBySku = async (req, res, next) => {
  try {
    const { sku_code } = req.params;
    const stockRes = await query(`
      SELECT p.sku_code, p.description AS sku_description, p.uom,
             COALESCE(s.current_qty, 0) AS current_qty,
             COALESCE(s.avg_rate, p.rate, 0) AS avg_rate,
             COALESCE(s.current_value, 0) AS current_value,
             COALESCE(s.reorder_level, 0) AS reorder_level
      FROM product_master p
      LEFT JOIN stock_summary s ON s.sku_code = p.sku_code
      WHERE p.sku_code = $1
    `, [sku_code]);
    if (!stockRes.rows.length) throw createError(404, `SKU ${sku_code} not found.`);
    return res.status(200).json({ success: true, data: stockRes.rows[0] });
  } catch (err) { next(err); }
};

const updateReorderLevel = async (req, res, next) => {
  try {
    const { sku_code } = req.params;
    const { reorder_level } = req.body;
    await query(`
      INSERT INTO stock_summary (sku_code, reorder_level)
      VALUES ($1, $2)
      ON CONFLICT (sku_code) DO UPDATE SET reorder_level = EXCLUDED.reorder_level
    `, [sku_code, reorder_level]);
    return res.status(200).json({ success: true, message: 'Reorder level updated' });
  } catch (err) { next(err); }
};

const getLowStockAlerts = async (req, res, next) => {
  try {
    const pool = require('../config/db')
    const result = await pool.query(`
      SELECT 
        sku_code,
        sku_description,
        uom,
        current_qty,
        reorder_level,
        reorder_level - current_qty as shortage_qty,
        CASE 
          WHEN current_qty = 0 THEN 'OUT_OF_STOCK'
          ELSE 'LOW_STOCK'
        END as status
      FROM stock_summary
      WHERE reorder_level > 0 
        AND current_qty <= reorder_level
      ORDER BY shortage_qty DESC
    `)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
};

// ── Stock Ledger ───────────────────────────────────────────────────
const getStockLedger = async (req, res, next) => {
  try {
    const { sku_code, from_date, to_date, transaction_type } = req.query;
    
    let sql = `SELECT * FROM stock_ledger WHERE 1=1`;
    const params = [];
    
    if (sku_code) {
      params.push(sku_code);
      sql += ` AND sku_code = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      sql += ` AND transaction_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      sql += ` AND transaction_date <= $${params.length}`;
    }
    if (transaction_type) {
      params.push(transaction_type);
      sql += ` AND transaction_type = $${params.length}`;
    }
    
    sql += ` ORDER BY transaction_date DESC, id DESC LIMIT 500`;
    
    const result = await query(sql, params);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const getStockLedgerBySku = async (req, res, next) => {
  try {
    const { sku_code } = req.params;
    const result = await query(`
      SELECT * FROM stock_ledger 
      WHERE sku_code = $1 
      ORDER BY transaction_date ASC, id ASC
    `, [sku_code]);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ── Purchases ──────────────────────────────────────────────────────
const getPurchases = async (req, res, next) => {
  try {
    const { sku_code, from_date, to_date } = req.query;
    let sql = `SELECT * FROM purchases WHERE 1=1`;
    const params = [];
    if (sku_code) {
      params.push(sku_code);
      sql += ` AND sku_code = $${params.length}`;
    }
    if (from_date) {
      params.push(from_date);
      sql += ` AND purchase_date >= $${params.length}`;
    }
    if (to_date) {
      params.push(to_date);
      sql += ` AND purchase_date <= $${params.length}`;
    }
    sql += ` ORDER BY purchase_date DESC, id DESC`;
    
    const result = await query(sql, params);
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createPurchase = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { purchase_date, supplier_name, sku_code, qty, rate, remarks } = req.body;
    const created_by = req.user?.id;
    
    const qty_num = parseFloat(qty);
    const rate_num = parseFloat(rate);
    if(qty_num <= 0 || rate_num <= 0) throw createError(400, 'Qty and Rate must be positive');

    const skuRes = await client.query('SELECT description, uom FROM product_master WHERE sku_code = $1', [sku_code]);
    if (!skuRes.rows.length) throw createError(404, `SKU ${sku_code} not found`);
    const { description, uom } = skuRes.rows[0];

    const purchase_no = await generateReferenceNo(client, 'purchases', 'PUR');
    const total_value = qty_num * rate_num;

    // Insert purchase
    const purRes = await client.query(`
      INSERT INTO purchases (purchase_no, purchase_date, supplier_name, sku_code, sku_description, uom, qty, rate, total_value, remarks, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `, [purchase_no, purchase_date || new Date().toISOString().slice(0, 10), supplier_name, sku_code, description, uom, qty_num, rate_num, total_value, remarks, created_by]);

    // Update summary and get prev balances
    const sumRes = await client.query(`
      INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (sku_code) DO UPDATE 
      SET current_qty = stock_summary.current_qty + EXCLUDED.current_qty,
          current_value = stock_summary.current_value + EXCLUDED.current_value,
          avg_rate = CASE 
            WHEN (stock_summary.current_qty + EXCLUDED.current_qty) = 0 THEN 0
            ELSE (stock_summary.current_value + EXCLUDED.current_value) / (stock_summary.current_qty + EXCLUDED.current_qty)
          END,
          last_updated = NOW()
      RETURNING current_qty, current_value
    `, [sku_code, description, uom, qty_num, total_value, rate_num]);

    const new_running_qty = sumRes.rows[0].current_qty;
    const new_running_value = sumRes.rows[0].current_value;

    // Insert ledger
    await client.query(`
      INSERT INTO stock_ledger (transaction_date, sku_code, sku_description, uom, transaction_type, reference_no, reference_type, qty_in, rate, value_in, running_balance, running_value, remarks, created_by)
      VALUES ($1, $2, $3, $4, 'PURCHASE', $5, 'PURCHASE', $6, $7, $8, $9, $10, $11, $12)
    `, [purchase_date || new Date().toISOString().slice(0, 10), sku_code, description, uom, purchase_no, qty_num, rate_num, total_value, new_running_qty, new_running_value, remarks, created_by]);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: purRes.rows[0], message: 'Purchase created' });
  } catch(err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

const deletePurchase = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    
    const purRes = await client.query('SELECT * FROM purchases WHERE id = $1', [id]);
    if (!purRes.rows.length) throw createError(404, 'Purchase not found');
    const p = purRes.rows[0];

    // Delete ledger entry associated
    await client.query(`DELETE FROM stock_ledger WHERE reference_no = $1 AND transaction_type = 'PURCHASE'`, [p.purchase_no]);
    
    // Update summary reversing effect
    // We reverse avg_rate carefully
    await client.query(`
      UPDATE stock_summary 
      SET current_qty = current_qty - $1,
          current_value = current_value - $2,
          avg_rate = CASE 
            WHEN (current_qty - $1) <= 0 THEN 0 
            ELSE (current_value - $2) / (current_qty - $1)
          END
      WHERE sku_code = $3
    `, [p.qty, p.total_value, p.sku_code]);

    await client.query('DELETE FROM purchases WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    return res.status(200).json({ success: true, message: 'Purchase deleted' });
  } catch(err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};

// ── Stock Adjustments ──────────────────────────────────────────────
const createAdjustment = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const { sku_code, adjustment_type, qty, rate, reason, adj_date } = req.body;
    const created_by = req.user?.id;
    
    const qty_num = parseFloat(qty);
    const rate_num = parseFloat(rate);
    if(qty_num <= 0) throw createError(400, 'Qty must be strictly positive');

    const skuRes = await client.query('SELECT description, uom FROM product_master WHERE sku_code = $1', [sku_code]);
    if (!skuRes.rows.length) throw createError(404, `SKU ${sku_code} not found`);
    const { description, uom } = skuRes.rows[0];

    const trans_type = adjustment_type.toUpperCase() === 'IN' ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT';
    const ref_no = await generateReferenceNo(client, 'stock_ledger', 'ADJ');
    const total_value = qty_num * rate_num;

    // Check existing stock if OUT
    const existSum = await client.query('SELECT current_qty FROM stock_summary WHERE sku_code = $1', [sku_code]);
    const curr_qty = existSum.rows.length ? parseFloat(existSum.rows[0].current_qty) : 0;
    
    if (trans_type === 'ADJUSTMENT_OUT' && curr_qty < qty_num) {
      throw createError(400, `Insufficient stock. Current qty is ${curr_qty}, cannot deduct ${qty_num}.`);
    }

    const qty_delta = trans_type === 'ADJUSTMENT_IN' ? qty_num : -qty_num;
    const val_delta = trans_type === 'ADJUSTMENT_IN' ? total_value : -total_value;

    const sumRes = await client.query(`
      INSERT INTO stock_summary (sku_code, sku_description, uom, current_qty, current_value, avg_rate, last_updated)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (sku_code) DO UPDATE 
      SET current_qty = stock_summary.current_qty + EXCLUDED.current_qty,
          current_value = stock_summary.current_value + EXCLUDED.current_value,
          avg_rate = CASE 
            WHEN (stock_summary.current_qty + EXCLUDED.current_qty) <= 0 THEN 0
            ELSE (stock_summary.current_value + EXCLUDED.current_value) / (stock_summary.current_qty + EXCLUDED.current_qty)
          END,
          last_updated = NOW()
      RETURNING current_qty, current_value
    `, [sku_code, description, uom, qty_delta, val_delta, rate_num]);

    const new_running_qty = sumRes.rows[0].current_qty;
    const new_running_value = sumRes.rows[0].current_value;

    // Insert ledger
    await client.query(`
      INSERT INTO stock_ledger 
        (transaction_date, sku_code, sku_description, uom, transaction_type, reference_no, reference_type, 
         qty_in, qty_out, rate, value_in, value_out, running_balance, running_value, remarks, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, 'ADJUSTMENT', 
              $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      adj_date || new Date().toISOString().slice(0, 10), sku_code, description, uom, trans_type, ref_no,
      trans_type === 'ADJUSTMENT_IN' ? qty_num : 0,
      trans_type === 'ADJUSTMENT_OUT' ? qty_num : 0,
      rate_num,
      trans_type === 'ADJUSTMENT_IN' ? total_value : 0,
      trans_type === 'ADJUSTMENT_OUT' ? total_value : 0,
      new_running_qty, new_running_value, reason, created_by
    ]);

    await client.query('COMMIT');
    return res.status(201).json({ success: true, message: 'Adjustment recorded successfully' });
  } catch(err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
};


const getStock = async (req, res, next) => {
  try {
    const pool = require('../config/db')
    const search = req.query.search || ''
    let sql = `
      SELECT 
        sku_code,
        sku_description,
        uom,
        current_qty,
        current_value,
        avg_rate,
        reorder_level,
        last_updated,
        CASE 
          WHEN current_qty = 0 THEN 'OUT_OF_STOCK'
          WHEN reorder_level > 0 AND current_qty <= reorder_level THEN 'LOW_STOCK'
          ELSE 'IN_STOCK'
        END as stock_status
      FROM stock_summary
    `
    let params = []
    if (search) {
      params.push('%' + search + '%')
      sql += ` WHERE sku_code ILIKE $1 OR sku_description ILIKE $1`
    }
    sql += ' ORDER BY sku_code'
    const result = await pool.query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getLedgerBySku = getStockLedgerBySku;
const getLowStock = getLowStockAlerts;
const getLedger = getStockLedger;
const getStockBySku = getStockSummaryBySku;

module.exports = {
  getStockSummary,
  getStockSummaryBySku,
  updateReorderLevel,
  getLowStockAlerts,
  getStockLedger,
  getStockLedgerBySku,
  getPurchases,
  createPurchase,
  deletePurchase,
  createAdjustment,
  getStock,
  getLedgerBySku,
  getLowStock,
  getLedger,
  getStockBySku};
