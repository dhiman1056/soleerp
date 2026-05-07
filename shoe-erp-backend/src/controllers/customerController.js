const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(cust_code FROM 6) AS INTEGER)), 0) + 1 AS next_num
    FROM customer_master WHERE cust_code ~ '^CUST-[0-9]+$'
  `)
  return `CUST-${String(rows[0].next_num).padStart(4, '0')}`
}

const WITH_BRAND = `
  SELECT c.*, b.brand_name, b.brand_code
  FROM customer_master c
  LEFT JOIN brand_master b ON c.brand_id = b.id
`

const listCustomers = async (req, res) => {
  try {
    const { search, brand_id, state, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`c.is_active = $${params.length}`)
    }
    if (brand_id) { params.push(brand_id); conditions.push(`c.brand_id = $${params.length}`) }
    if (state)    { params.push(`%${state}%`); conditions.push(`c.state ILIKE $${params.length}`) }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(c.cust_name ILIKE $${params.length} OR c.cust_code ILIKE $${params.length} OR c.city ILIKE $${params.length} OR c.gstin ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`${WITH_BRAND} ${where} ORDER BY c.cust_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[customerController] listCustomers:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const getCustomer = async (req, res) => {
  try {
    const { rows } = await query(`${WITH_BRAND} WHERE c.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const createCustomer = async (req, res) => {
  try {
    const {
      cust_name, description, brand_id, gstin, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      msme_certificate, credit_limit = 0, payment_terms
    } = req.body

    if (!cust_name?.trim()) return res.status(400).json({ success: false, message: 'Customer name is required' })

    const cust_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO customer_master
        (cust_code, cust_name, description, brand_id, gstin, address, state, city, pincode,
         contact_person, contact_mobile, email, customer_care_no, msme_certificate, credit_limit, payment_terms)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [
      cust_code, cust_name.trim(), description||null, brand_id||null, gstin||null,
      address||null, state||null, city||null, pincode||null,
      contact_person||null, contact_mobile||null, email||null,
      customer_care_no||null, msme_certificate||null,
      parseFloat(credit_limit)||0, payment_terms||null
    ])

    const { rows: full } = await query(`${WITH_BRAND} WHERE c.id = $1`, [rows[0].id])
    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[customerController] createCustomer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const updateCustomer = async (req, res) => {
  try {
    const { id } = req.params
    const {
      cust_name, description, brand_id, gstin, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      msme_certificate, credit_limit, payment_terms, is_active
    } = req.body

    const { rows } = await query(`
      UPDATE customer_master SET
        cust_name        = COALESCE($1,  cust_name),
        description      = COALESCE($2,  description),
        brand_id         = COALESCE($3,  brand_id),
        gstin            = COALESCE($4,  gstin),
        address          = COALESCE($5,  address),
        state            = COALESCE($6,  state),
        city             = COALESCE($7,  city),
        pincode          = COALESCE($8,  pincode),
        contact_person   = COALESCE($9,  contact_person),
        contact_mobile   = COALESCE($10, contact_mobile),
        email            = COALESCE($11, email),
        customer_care_no = COALESCE($12, customer_care_no),
        msme_certificate = COALESCE($13, msme_certificate),
        credit_limit     = COALESCE($14, credit_limit),
        payment_terms    = COALESCE($15, payment_terms),
        is_active        = COALESCE($16, is_active),
        updated_at       = NOW()
      WHERE id = $17
      RETURNING *
    `, [
      cust_name ? cust_name.trim() : null,
      description??null, brand_id||null, gstin??null, address??null,
      state??null, city??null, pincode??null, contact_person??null,
      contact_mobile??null, email??null, customer_care_no??null,
      msme_certificate??null,
      credit_limit !== undefined ? parseFloat(credit_limit)||0 : null,
      payment_terms??null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Customer not found' })
    const { rows: full } = await query(`${WITH_BRAND} WHERE c.id = $1`, [rows[0].id])
    res.json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[customerController] updateCustomer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

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
