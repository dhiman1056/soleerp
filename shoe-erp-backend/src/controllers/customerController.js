const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(cust_code FROM 6) AS INTEGER)), 0) + 1 AS next_num
    FROM customer_master WHERE cust_code ~ '^CUST-[0-9]+$'
  `)
  return `CUST-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/customers ───────────────────────────────────────────────────────
const listCustomers = async (req, res) => {
  try {
    const { search, state, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    } else {
      conditions.push(`is_active = true`)
    }
    if (state) { params.push(`%${state}%`); conditions.push(`state ILIKE $${params.length}`) }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(cust_name ILIKE $${params.length} OR cust_code ILIKE $${params.length} OR city ILIKE $${params.length} OR gstin ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`SELECT * FROM customer_master ${where} ORDER BY cust_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[customerController] listCustomers:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/customers/:id ───────────────────────────────────────────────────
const getCustomer = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM customer_master WHERE id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[customerController] getCustomer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/customers ──────────────────────────────────────────────────────
const createCustomer = async (req, res) => {
  try {
    const {
      cust_name, customer_type, gstin, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      credit_limit = 0, payment_terms
    } = req.body

    if (!cust_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Customer name is required' })
    }

    if (customer_type === 'B2B' && (!gstin || !gstin.trim())) {
      return res.status(400).json({ success: false, message: 'GSTIN is required for B2B customers' })
    }

    const cust_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO customer_master (
        cust_code, cust_name, customer_type, gstin, address, state, city, pincode,
        contact_person, contact_mobile, email, customer_care_no, credit_limit, payment_terms
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      cust_code,
      cust_name.trim(),
      customer_type || 'B2C',
      gstin || null,
      address || null,
      state || null,
      city || null,
      pincode || null,
      contact_person || null,
      contact_mobile || null,
      email || null,
      customer_care_no || null,
      parseFloat(credit_limit) || 0,
      payment_terms || null
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[customerController] createCustomer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/customers/:id ───────────────────────────────────────────────────
const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params
    const {
      cust_name, customer_type, gstin, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      credit_limit, payment_terms, is_active
    } = req.body

    if (customer_type === 'B2B' && gstin !== undefined && (!gstin || !gstin.trim())) {
      return res.status(400).json({ success: false, message: 'GSTIN is required for B2B customers' })
    }

    const { rows } = await query(`
      UPDATE customer_master SET
        cust_name        = COALESCE($1,  cust_name),
        customer_type    = COALESCE($2,  customer_type),
        gstin            = COALESCE($3,  gstin),
        address          = COALESCE($4,  address),
        state            = COALESCE($5,  state),
        city             = COALESCE($6,  city),
        pincode          = COALESCE($7,  pincode),
        contact_person   = COALESCE($8,  contact_person),
        contact_mobile   = COALESCE($9,  contact_mobile),
        email            = COALESCE($10, email),
        customer_care_no = COALESCE($11, customer_care_no),
        credit_limit     = COALESCE($12, credit_limit),
        payment_terms    = COALESCE($13, payment_terms),
        is_active        = COALESCE($14, is_active),
        updated_at       = NOW()
      WHERE id = $15
      RETURNING *
    `, [
      cust_name ? cust_name.trim() : null,
      customer_type || null,
      gstin ?? null,
      address ?? null,
      state ?? null,
      city ?? null,
      pincode ?? null,
      contact_person ?? null,
      contact_mobile ?? null,
      email ?? null,
      customer_care_no ?? null,
      credit_limit !== undefined ? parseFloat(credit_limit) || 0 : null,
      payment_terms ?? null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[customerController] updateCustomer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/customers/:id ────────────────────────────────────────────────
const deleteCustomer = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE customer_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' })
    res.json({ success: true, message: 'Customer deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer, deleteCustomer }
