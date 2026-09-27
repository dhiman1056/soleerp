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
 * Helper to parse single or multiple stock groups into both array and comma-string
 */
async function parseStockGroups(stock_group, stock_groups) {
  let list = [];
  if (Array.isArray(stock_groups)) {
    list = stock_groups.map(s => String(s).trim()).filter(Boolean);
  } else if (Array.isArray(stock_group)) {
    list = stock_group.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof stock_groups === 'string' && stock_groups.trim()) {
    list = stock_groups.split(',').map(s => s.trim().replace(/^[\(\)]+|[\(\)]+$/g, '')).filter(Boolean);
  } else if (typeof stock_group === 'string' && stock_group.trim()) {
    list = stock_group.split(',').map(s => s.trim().replace(/^[\(\)]+|[\(\)]+$/g, '')).filter(Boolean);
  }

  // Deduplicate case-insensitively
  const seen = new Set();
  const uniqueList = [];
  for (const item of list) {
    const lower = item.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      uniqueList.push(item);
    }
  }

  let ids = [];
  if (uniqueList.length > 0) {
    const { rows } = await query(
      `SELECT id, dept_name FROM department_master WHERE UPPER(dept_name) = ANY($1)`,
      [uniqueList.map(s => s.toUpperCase())]
    );
    const nameToId = new Map(rows.map(r => [r.dept_name.toUpperCase(), r.id]));
    ids = uniqueList.map(name => nameToId.get(name.toUpperCase())).filter(Boolean);
  }

  return {
    stock_groups: uniqueList.length > 0 ? uniqueList : null,
    stock_group_ids: ids.length > 0 ? ids : null,
    stock_group: uniqueList.length > 0 ? uniqueList.join(', ') : null,
    stock_group_id: ids.length > 0 ? ids[0] : null
  };
}

/**
 * GET /api/suppliers
 */
exports.getAllSuppliers = async (req, res, next) => {
  try {
    const { search, city, is_active, stock_group, type, supplier_type } = req.query;

    let q = `
      SELECT s.*, 
        COALESCE(s.supplier_type, s.type, 'PURCHASE') AS type,
        COALESCE(s.supplier_type, s.type, 'PURCHASE') AS supplier_type,
        b.brand_name,
        b.brand_code,
        sg.dept_name AS stock_group_name,
        sg.sg_code,
        (SELECT COALESCE(running_balance, 0) 
         FROM supplier_ledger sl 
         WHERE sl.supplier_id = s.id 
         ORDER BY id DESC LIMIT 1) as outstanding_balance
      FROM suppliers s
      LEFT JOIN brand_master b ON s.brand_id = b.id
      LEFT JOIN department_master sg ON (s.stock_group_id = sg.id OR (s.stock_group_id IS NULL AND LOWER(s.stock_group) = LOWER(sg.dept_name)))
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      q += ` AND (s.supplier_name ILIKE $${params.length} OR s.supplier_code ILIKE $${params.length} OR s.stock_group ILIKE $${params.length} OR s.supplier_type ILIKE $${params.length} OR s.type ILIKE $${params.length})`;
    }
    if (city) {
      params.push(city);
      q += ` AND s.city = $${params.length}`;
    }
    if (stock_group) {
      params.push(`%${stock_group}%`);
      const pLike = params.length;
      params.push(stock_group.trim());
      const pExact = params.length;
      q += ` AND (s.stock_group ILIKE $${pLike} OR sg.dept_name ILIKE $${pLike} OR $${pExact} = ANY(s.stock_groups))`;
    }
    const filterType = type || supplier_type;
    if (filterType) {
      params.push(filterType.toUpperCase());
      q += ` AND (UPPER(COALESCE(s.supplier_type, s.type, '')) = $${params.length})`;
    }
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      q += ` AND s.is_active = $${params.length}`;
    } else {
      q += ` AND s.is_active = true`;
    }

    q += ` ORDER BY 
      CASE WHEN s.supplier_code ~ '^[0-9]+$' THEN CAST(s.supplier_code AS INTEGER) ELSE 999999 END ASC,
      s.supplier_code ASC`;

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
    
    const { rows: supRows } = await query(`
      SELECT s.*, 
        COALESCE(s.supplier_type, s.type, 'PURCHASE') AS type,
        COALESCE(s.supplier_type, s.type, 'PURCHASE') AS supplier_type,
        b.brand_name, b.brand_code,
        sg.dept_name AS stock_group_name, sg.sg_code
      FROM suppliers s
      LEFT JOIN brand_master b ON s.brand_id = b.id
      LEFT JOIN department_master sg ON (s.stock_group_id = sg.id OR (s.stock_group_id IS NULL AND LOWER(s.stock_group) = LOWER(sg.dept_name)))
      WHERE s.id = $1
    `, [id]);

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
      supplier_code: customCode,
      supplier_name, gstin, brand_id, payment_terms,
      address, city, state, pincode,
      contact_person, phone, email,
      customer_care_no, msme_certificate, licence_no,
      credit_limit,
      stock_group, stock_groups, stock_group_id, stock_group_ids,
      supplier_type, type
    } = req.body;

    if (!supplier_name?.trim()) {
      return res.status(400).json({ 
        message: 'Supplier name is required' 
      });
    }

    const finalType = (supplier_type || type || 'PURCHASE').trim().toUpperCase();
    const parsedSG = await parseStockGroups(stock_group, stock_groups);
    const finalStockGroup = parsedSG.stock_group;
    const finalStockGroupId = stock_group_id ? Number(stock_group_id) : parsedSG.stock_group_id;
    const finalStockGroups = parsedSG.stock_groups;
    const finalStockGroupIds = parsedSG.stock_group_ids;

    const supplier_code = (customCode && String(customCode).trim()) ? String(customCode).trim() : await generateSupplierCode();

    const { rows } = await query(`
      INSERT INTO suppliers (
        supplier_code, supplier_name, gstin, brand_id, payment_terms,
        address, city, state, pincode, contact_person, phone, email,
        customer_care_no, msme_certificate, licence_no, credit_limit,
        stock_group, stock_group_id, stock_groups, stock_group_ids,
        supplier_type, type,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $21, $22)
      RETURNING *
    `, [
      supplier_code,
      supplier_name.trim(),
      gstin ? gstin.trim().toUpperCase() : null,
      brand_id ? Number(brand_id) : null,
      payment_terms ? payment_terms.trim() : null,
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      pincode ? pincode.trim() : null,
      contact_person ? contact_person.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim().toLowerCase() : null,
      customer_care_no ? customer_care_no.trim() : null,
      msme_certificate ? msme_certificate.trim() : null,
      licence_no ? licence_no.trim() : null,
      credit_limit || 0,
      finalStockGroup,
      finalStockGroupId,
      finalStockGroups,
      finalStockGroupIds,
      finalType,
      req.user?.id || null
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
      supplier_code,
      supplier_name, gstin, brand_id, payment_terms,
      address, city, state, pincode,
      contact_person, phone, email,
      customer_care_no, msme_certificate, licence_no,
      credit_limit, is_active,
      stock_group, stock_groups, stock_group_id, stock_group_ids,
      supplier_type, type
    } = req.body;

    if (supplier_name !== undefined && !supplier_name?.trim()) {
      return res.status(400).json({ 
        message: 'Supplier name is required' 
      });
    }

    const finalType = (supplier_type || type) ? (supplier_type || type).trim().toUpperCase() : null;
    
    let updateSG = false;
    let finalStockGroup = null;
    let finalStockGroupId = null;
    let finalStockGroups = null;
    let finalStockGroupIds = null;

    if (stock_group !== undefined || stock_groups !== undefined) {
      updateSG = true;
      const parsedSG = await parseStockGroups(stock_group, stock_groups);
      finalStockGroup = parsedSG.stock_group;
      finalStockGroupId = stock_group_id !== undefined ? (stock_group_id ? Number(stock_group_id) : null) : parsedSG.stock_group_id;
      finalStockGroups = parsedSG.stock_groups;
      finalStockGroupIds = parsedSG.stock_group_ids;
    }

    const { rows } = await query(`
      UPDATE suppliers SET
        supplier_code = COALESCE($1, supplier_code),
        supplier_name = COALESCE($2, supplier_name),
        gstin = COALESCE($3, gstin),
        brand_id = COALESCE($4, brand_id),
        payment_terms = COALESCE($5, payment_terms),
        address = COALESCE($6, address),
        city = COALESCE($7, city),
        state = COALESCE($8, state),
        pincode = COALESCE($9, pincode),
        contact_person = COALESCE($10, contact_person),
        phone = COALESCE($11, phone),
        email = COALESCE($12, email),
        customer_care_no = COALESCE($13, customer_care_no),
        msme_certificate = COALESCE($14, msme_certificate),
        licence_no = COALESCE($15, licence_no),
        credit_limit = COALESCE($16, credit_limit),
        is_active = COALESCE($17, is_active),
        stock_group = CASE WHEN $18::boolean THEN $19 ELSE stock_group END,
        stock_group_id = CASE WHEN $18::boolean THEN $20 ELSE stock_group_id END,
        stock_groups = CASE WHEN $18::boolean THEN $21 ELSE stock_groups END,
        stock_group_ids = CASE WHEN $18::boolean THEN $22 ELSE stock_group_ids END,
        supplier_type = COALESCE($23, supplier_type),
        type = COALESCE($23, type),
        updated_at = NOW(),
        updated_by = $24
      WHERE id = $25
      RETURNING *
    `, [
      supplier_code !== undefined ? (supplier_code ? String(supplier_code).trim() : null) : null,
      supplier_name !== undefined ? supplier_name.trim() : null,
      gstin !== undefined ? (gstin ? gstin.trim().toUpperCase() : null) : null,
      brand_id !== undefined ? (brand_id ? Number(brand_id) : null) : null,
      payment_terms !== undefined ? (payment_terms ? payment_terms.trim() : null) : null,
      address !== undefined ? (address ? address.trim() : null) : null,
      city !== undefined ? (city ? city.trim() : null) : null,
      state !== undefined ? (state ? state.trim() : null) : null,
      pincode !== undefined ? (pincode ? pincode.trim() : null) : null,
      contact_person !== undefined ? (contact_person ? contact_person.trim() : null) : null,
      phone !== undefined ? (phone ? phone.trim() : null) : null,
      email !== undefined ? (email ? email.trim().toLowerCase() : null) : null,
      customer_care_no !== undefined ? (customer_care_no ? customer_care_no.trim() : null) : null,
      msme_certificate !== undefined ? (msme_certificate ? msme_certificate.trim() : null) : null,
      licence_no !== undefined ? (licence_no ? licence_no.trim() : null) : null,
      credit_limit !== undefined ? credit_limit : null,
      is_active !== undefined ? is_active : null,
      updateSG,
      finalStockGroup,
      finalStockGroupId,
      finalStockGroups,
      finalStockGroupIds,
      finalType,
      req.user?.id || null,
      id
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

/**
 * POST /api/suppliers/import
 * Bulk import suppliers from Excel / CSV
 */
exports.importSuppliers = async (req, res, next) => {
  const rows = req.body.rows || req.body.items;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: 'No rows provided for import' });
  }

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      const supplier_code_in = (row['SUPP CODE']      || row['supp_code']        || row['Supplier Code']    || row['supplier_code'] || '').toString().trim();
      const supplier_name    = (row['SUPPLIER']       || row['Supplier']         || row['Supplier Name']    || row['supplier_name'] || '').trim();
      const stock_group_in   = (row['STOCK GROUP']    || row['Stock Group']      || row['stock_group']      || '').trim();
      const type_in          = (row['TYPE']           || row['Type']             || row['Supplier Type']    || row['supplier_type'] || 'PURCHASE').trim().toUpperCase();
      const gstin           = (row['GSTIN']            || row['gstin']            || '').trim().toUpperCase();
      const contact_person  = (row['Contact Person']   || row['contact_person']   || '').trim();
      const phone           = (row['Phone']            || row['phone']            || row['contact_mobile'] || '').trim();
      const email           = (row['Email']            || row['email']            || '').trim().toLowerCase();
      const address         = (row['Address']          || row['address']          || '').trim();
      const city            = (row['City']             || row['city']             || '').trim();
      const state           = (row['State']            || row['state']            || '').trim();
      const pincode         = (row['Pincode']          || row['pincode']          || '').trim();
      const payment_terms   = (row['Payment Terms']    || row['payment_terms']    || '').trim();
      const credit_limit    = parseFloat(row['Credit Limit'] || row['credit_limit'] || 0) || 0;
      const customer_care_no = (row['Customer Care No'] || row['customer_care_no'] || '').trim();
      const msme_certificate = (row['MSME Certificate'] || row['msme_certificate'] || '').trim();
      const licence_no      = (row['Licence No']       || row['licence_no']       || '').trim();
      const brand_name      = (row['Brand Name']       || row['brand_name']       || '').trim();

      if (!supplier_name) {
        errors.push({ row: rowNum, message: 'Supplier Name is required' });
        continue;
      }
      if (gstin && gstin.length !== 15) {
        errors.push({ row: rowNum, message: 'GSTIN must be 15 characters' });
        continue;
      }
      if (email && !email.includes('@')) {
        errors.push({ row: rowNum, message: 'Invalid email format' });
        continue;
      }

      const parsedSG = await parseStockGroups(stock_group_in, null);

      // Check duplicates
      const dup = await query(
        'SELECT id FROM suppliers WHERE LOWER(supplier_name) = LOWER($1)',
        [supplier_name]
      );
      if (dup.rows.length > 0) {
        await query(`
          UPDATE suppliers SET
            supplier_code = COALESCE(NULLIF($1, ''), supplier_code),
            stock_group = COALESCE(NULLIF($2, ''), stock_group),
            stock_groups = COALESCE($3, stock_groups),
            stock_group_ids = COALESCE($4, stock_group_ids),
            supplier_type = COALESCE(NULLIF($5, ''), supplier_type),
            type = COALESCE(NULLIF($5, ''), type),
            is_active = true,
            updated_at = NOW()
          WHERE id = $6
        `, [
          supplier_code_in,
          parsedSG.stock_group,
          parsedSG.stock_groups,
          parsedSG.stock_group_ids,
          type_in,
          dup.rows[0].id
        ]);
        imported++;
        continue;
      }

      let brand_id = null;
      if (brand_name) {
        const brandRes = await query('SELECT id FROM brand_master WHERE LOWER(brand_name) = LOWER($1)', [brand_name]);
        if (brandRes.rows.length > 0) {
          brand_id = brandRes.rows[0].id;
        }
      }

      const supplier_code = supplier_code_in || await generateSupplierCode();

      await query(`
        INSERT INTO suppliers (
          supplier_code, supplier_name, stock_group, stock_group_id, stock_groups, stock_group_ids, supplier_type, type,
          gstin, brand_id, payment_terms, address, city, state, pincode,
          contact_person, phone, email, customer_care_no, msme_certificate,
          licence_no, credit_limit, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      `, [
        supplier_code,
        supplier_name,
        parsedSG.stock_group,
        parsedSG.stock_group_id,
        parsedSG.stock_groups,
        parsedSG.stock_group_ids,
        type_in || 'PURCHASE',
        gstin || null,
        brand_id,
        payment_terms || null,
        address || null,
        city || null,
        state || null,
        pincode || null,
        contact_person || null,
        phone || null,
        email || null,
        customer_care_no || null,
        msme_certificate || null,
        licence_no || null,
        credit_limit,
        req.user?.id || null
      ]);

      imported++;
    } catch (err) {
      errors.push({ row: rowNum, message: err.message });
    }
  }

  return res.json({ success: true, imported, skipped, errors });
};
