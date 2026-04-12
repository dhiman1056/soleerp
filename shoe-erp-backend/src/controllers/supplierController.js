'use strict';

const { query, pool } = require('../config/db');

/**
 * Auto-generate supplier code using the sequence
 */
async function generateSupplierCode() {
  const { rows } = await query(`SELECT nextval('supplier_seq') AS seq`);
  const seq = rows[0].seq;
  return `SUP-${String(seq).padStart(3, '0')}`;
}

/**
 * GET /api/suppliers
 */
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const { search, city, is_active } = req.query;

    let q = `
      SELECT s.*, 
        (SELECT COALESCE(running_balance, 0) 
         FROM supplier_ledger sl 
         WHERE sl.supplier_id = s.id 
         ORDER BY id DESC LIMIT 1) as outstanding_balance
      FROM suppliers s
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      q += ` AND (s.supplier_name ILIKE $${params.length} OR s.supplier_code ILIKE $${params.length})`;
    }
    if (city) {
      params.push(city);
      q += ` AND s.city = $${params.length}`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      q += ` AND s.is_active = $${params.length}`;
    }

    q += ` ORDER BY s.id DESC`;

    const { rows } = await query(q, params);
    return res.json({ success: true, count: rows.length, data: rows });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/suppliers/:id
 */
exports.getSupplierById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const { rows: supRows } = await query(`SELECT * FROM suppliers WHERE id = $1`, [id]);
    if (supRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Ledger Summary
    const { rows: ledgerRows } = await query(`
      SELECT 
        COALESCE(SUM(credit), 0) AS total_purchased,
        COALESCE(SUM(debit), 0) AS total_paid,
        (SELECT COALESCE(running_balance, 0) FROM supplier_ledger WHERE supplier_id = $1 ORDER BY id DESC LIMIT 1) AS outstanding_balance,
        (SELECT transaction_date FROM supplier_ledger WHERE supplier_id = $1 AND transaction_type = 'PURCHASE' ORDER BY id DESC LIMIT 1) AS last_purchase_date
      FROM supplier_ledger 
      WHERE supplier_id = $1
    `, [id]);

    return res.json({ 
      success: true, 
      data: {
        ...supRows[0],
        summary: ledgerRows[0] || { total_purchased: 0, total_paid: 0, outstanding_balance: 0, last_purchase_date: null }
      } 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/suppliers
 */
exports.createSupplier = async (req, res, next) => {
  try {
    const { 
      supplier_name, contact_person, phone, email, address, 
      city, state, pincode, gstin, payment_terms, credit_limit 
    } = req.body;

    const supplier_code = await generateSupplierCode();

    const { rows } = await query(`
      INSERT INTO suppliers (
        supplier_code, supplier_name, contact_person, phone, email, address, 
        city, state, pincode, gstin, payment_terms, credit_limit, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      supplier_code, supplier_name, contact_person, phone, email, address, 
      city, state, pincode, gstin, payment_terms, credit_limit || 0, req.user.id
    ]);

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Supplier code or detail exists already.'});
    next(err);
  }
};

/**
 * PUT /api/suppliers/:id
 */
exports.updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      supplier_name, contact_person, phone, email, address, 
      city, state, pincode, gstin, payment_terms, credit_limit, is_active 
    } = req.body;

    const { rows } = await query(`
      UPDATE suppliers SET
        supplier_name = COALESCE($1, supplier_name),
        contact_person = COALESCE($2, contact_person),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        pincode = COALESCE($8, pincode),
        gstin = COALESCE($9, gstin),
        payment_terms = COALESCE($10, payment_terms),
        credit_limit = COALESCE($11, credit_limit),
        is_active = COALESCE($12, is_active)
      WHERE id = $13
      RETURNING *
    `, [
      supplier_name, contact_person, phone, email, address, 
      city, state, pincode, gstin, payment_terms, credit_limit, is_active, id
    ]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/suppliers/:id
 */
exports.deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { rows: poRows } = await query(`SELECT id FROM purchase_orders WHERE supplier_id = $1 AND status NOT IN ('RECEIVED', 'CANCELLED')`, [id]);
    if (poRows.length > 0) {
      return res.status(400).json({ success: false, message: 'Cannot delete. Supplier has open Purchase Orders.' });
    }

    const { rows } = await query(`UPDATE suppliers SET is_active = FALSE WHERE id = $1 RETURNING *`, [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Supplier not found' });

    return res.json({ success: true, message: 'Supplier deactivated successfully', data: rows[0] });
  } catch (err) {
    next(err);
  }
};


// ─────────────────────────────────────────────────────────
// SUPPLIER LEDGER APIs
// ─────────────────────────────────────────────────────────

/**
 * GET /api/suppliers/:id/ledger
 */
exports.getSupplierLedger = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { from_date, to_date } = req.query;

    let q = `SELECT * FROM supplier_ledger WHERE supplier_id = $1`;
    const params = [id];

    if (from_date) { params.push(from_date); q += ` AND transaction_date >= $${params.length}`; }
    if (to_date)   { params.push(to_date);   q += ` AND transaction_date <= $${params.length}`; }
    q += ` ORDER BY id ASC`;

    const { rows } = await query(q, params);

    // Calculate opening balance if from_date is provided
    let opening_balance = 0;
    if (from_date) {
      const { rows: obRows } = await query(`
         SELECT running_balance FROM supplier_ledger 
         WHERE supplier_id = $1 AND transaction_date < $2 
         ORDER BY id DESC LIMIT 1
      `, [id, from_date]);
      if (obRows.length > 0) opening_balance = parseFloat(obRows[0].running_balance);
    }

    return res.json({ success: true, data: { opening_balance, transactions: rows } });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/suppliers/:id/payment
 */
exports.recordPayment = async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { payment_date, amount, reference_no, remarks } = req.body;

    if (!amount || amount <= 0) throw new Error("Payment amount must be greater than 0");

    // Get current running balance
    const { rows: balRows } = await client.query(`
      SELECT running_balance FROM supplier_ledger 
      WHERE supplier_id = $1 ORDER BY id DESC LIMIT 1 FOR UPDATE
    `, [id]);
    
    let currentBal = balRows.length > 0 ? parseFloat(balRows[0].running_balance) : 0;
    let newBal = currentBal - parseFloat(amount); // Payment reduces payable balance

    const { rows } = await client.query(`
      INSERT INTO supplier_ledger (
        transaction_date, supplier_id, transaction_type, reference_no, 
        debit, credit, running_balance, remarks, created_by
      ) VALUES ($1, $2, 'PAYMENT', $3, $4, 0, $5, $6, $7)
      RETURNING *
    `, [payment_date || new Date(), id, reference_no, amount, newBal, remarks, req.user.id]);

    await client.query('COMMIT');
    return res.json({ success: true, message: 'Payment recorded successfully', data: rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};
