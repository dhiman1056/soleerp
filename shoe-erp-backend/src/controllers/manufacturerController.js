const { query } = require('../config/db')

// ─── Auto-generate mfr_code: MFR-0001, MFR-0002 … ───────────────────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(mfr_code FROM 5) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM manufacturer_master
    WHERE mfr_code ~ '^MFR-[0-9]+$'
  `)
  return `MFR-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/manufacturers ───────────────────────────────────────────────────
const listManufacturers = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = []
    const params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    } else {
      conditions.push(`is_active = true`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(mfr_name ILIKE $${params.length} OR mfr_code ILIKE $${params.length} OR city ILIKE $${params.length} OR contact_person ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `SELECT * FROM manufacturer_master ${where} ORDER BY mfr_code`,
      params
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[manufacturerController] listManufacturers:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/manufacturers/:id ───────────────────────────────────────────────
const getManufacturer = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM manufacturer_master WHERE id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Manufacturer not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[manufacturerController] getManufacturer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/manufacturers ──────────────────────────────────────────────────
const createManufacturer = async (req, res) => {
  try {
    const {
      mfr_name, description,
      licence_no, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no
    } = req.body

    if (!mfr_name || !mfr_name.trim()) {
      return res.status(400).json({ success: false, message: 'Manufacturer name is required' })
    }

    const mfr_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO manufacturer_master (
        mfr_code, mfr_name, description,
        licence_no, address, state, city, pincode,
        contact_person, contact_mobile, email, customer_care_no
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
    `, [
      mfr_code,
      mfr_name.trim(),
      description        || null,
      licence_no         || null,
      address            || null,
      state              || null,
      city               || null,
      pincode            || null,
      contact_person     || null,
      contact_mobile     || null,
      email              || null,
      customer_care_no   || null
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[manufacturerController] createManufacturer:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Manufacturer code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/manufacturers/:id ───────────────────────────────────────────────
const updateManufacturer = async (req, res) => {
  try {
    const { id } = req.params
    const {
      mfr_name, description,
      licence_no, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      is_active
    } = req.body

    const { rows } = await query(`
      UPDATE manufacturer_master SET
        mfr_name         = COALESCE($1,  mfr_name),
        description      = COALESCE($2,  description),
        licence_no       = COALESCE($3,  licence_no),
        address          = COALESCE($4,  address),
        state            = COALESCE($5,  state),
        city             = COALESCE($6,  city),
        pincode          = COALESCE($7,  pincode),
        contact_person   = COALESCE($8,  contact_person),
        contact_mobile   = COALESCE($9,  contact_mobile),
        email            = COALESCE($10, email),
        customer_care_no = COALESCE($11, customer_care_no),
        is_active        = COALESCE($12, is_active),
        updated_at       = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      mfr_name ? mfr_name.trim() : null,
      description        ?? null,
      licence_no         ?? null,
      address            ?? null,
      state              ?? null,
      city               ?? null,
      pincode            ?? null,
      contact_person     ?? null,
      contact_mobile     ?? null,
      email              ?? null,
      customer_care_no   ?? null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Manufacturer not found' })

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[manufacturerController] updateManufacturer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/manufacturers/:id (soft delete) ──────────────────────────────
const deleteManufacturer = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE manufacturer_master
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Manufacturer not found' })
    res.json({ success: true, message: 'Manufacturer deactivated' })
  } catch (err) {
    console.error('[manufacturerController] deleteManufacturer:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const importManufacturers = async (req, res) => {
  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'No rows provided' })
  }

  let imported = 0, skipped = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    try {
      const mfr_name        = (row['Manufacturer Name']  || '').trim()
      const licence_no      = (row['Licence No']         || '').trim()
      const address         = (row['Address']            || '').trim()
      const city            = (row['City']               || '').trim()
      const state           = (row['State']              || '').trim()
      const pincode         = (row['Pincode']            || '').trim()
      const contact_person  = (row['Contact Person']     || '').trim()
      const contact_mobile  = (row['Contact Mobile']     || '').trim()
      const email           = (row['Email']              || '').trim()
      const customer_care_no = (row['Customer Care No']  || '').trim()

      if (!mfr_name) {
        errors.push({ row: rowNum, message: 'Manufacturer Name is required' })
        continue
      }
      if (contact_mobile && !/^[0-9]{10}$/.test(contact_mobile)) {
        errors.push({ row: rowNum, message: 'Contact Mobile must be 10 digits' })
        continue
      }
      if (customer_care_no && !/^[0-9]{10}$/.test(customer_care_no)) {
        errors.push({ row: rowNum, message: 'Customer Care No must be 10 digits' })
        continue
      }
      if (email && !email.includes('@')) {
        errors.push({ row: rowNum, message: 'Invalid email format' })
        continue
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM manufacturer_master WHERE LOWER(mfr_name) = LOWER($1)',
        [mfr_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const mfr_code = await generateCode()
      await query(`
        INSERT INTO manufacturer_master
          (mfr_code, mfr_name, licence_no, address, city, state,
           pincode, contact_person, contact_mobile, email, customer_care_no)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        mfr_code, mfr_name, licence_no || null,
        address || null, city || null, state || null,
        pincode || null, contact_person || null,
        contact_mobile || null, email || null,
        customer_care_no || null
      ])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listManufacturers,
  getManufacturer,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer,
  importManufacturers
}

