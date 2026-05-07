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

// ─── Shared SELECT with JOIN ──────────────────────────────────────────────────
const WITH_BRAND = `
  SELECT
    m.*,
    b.brand_name,
    b.brand_code
  FROM manufacturer_master m
  LEFT JOIN brand_master b ON m.brand_id = b.id
`

// ─── GET /api/manufacturers ───────────────────────────────────────────────────
const listManufacturers = async (req, res) => {
  try {
    const { search, brand_id, is_active } = req.query
    const conditions = []
    const params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`m.is_active = $${params.length}`)
    }

    if (brand_id) {
      params.push(brand_id)
      conditions.push(`m.brand_id = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(m.mfr_name ILIKE $${params.length} OR m.mfr_code ILIKE $${params.length} OR m.city ILIKE $${params.length} OR m.contact_person ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `${WITH_BRAND} ${where} ORDER BY m.mfr_code`,
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
    const { rows } = await query(`${WITH_BRAND} WHERE m.id = $1`, [req.params.id])
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
      mfr_name, description, brand_id,
      licence_no, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      msme_certificate, gstin
    } = req.body

    if (!mfr_name || !mfr_name.trim()) {
      return res.status(400).json({ success: false, message: 'Manufacturer name is required' })
    }

    const mfr_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO manufacturer_master (
        mfr_code, mfr_name, description, brand_id,
        licence_no, address, state, city, pincode,
        contact_person, contact_mobile, email, customer_care_no,
        msme_certificate, gstin
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
    `, [
      mfr_code,
      mfr_name.trim(),
      description        || null,
      brand_id           || null,
      licence_no         || null,
      address            || null,
      state              || null,
      city               || null,
      pincode            || null,
      contact_person     || null,
      contact_mobile     || null,
      email              || null,
      customer_care_no   || null,
      msme_certificate   || null,
      gstin              || null
    ])

    // Re-fetch with JOIN
    const { rows: full } = await query(`${WITH_BRAND} WHERE m.id = $1`, [rows[0].id])
    res.status(201).json({ success: true, data: full[0] })
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
      mfr_name, description, brand_id,
      licence_no, address, state, city, pincode,
      contact_person, contact_mobile, email, customer_care_no,
      msme_certificate, gstin, is_active
    } = req.body

    const { rows } = await query(`
      UPDATE manufacturer_master SET
        mfr_name         = COALESCE($1,  mfr_name),
        description      = COALESCE($2,  description),
        brand_id         = COALESCE($3,  brand_id),
        licence_no       = COALESCE($4,  licence_no),
        address          = COALESCE($5,  address),
        state            = COALESCE($6,  state),
        city             = COALESCE($7,  city),
        pincode          = COALESCE($8,  pincode),
        contact_person   = COALESCE($9,  contact_person),
        contact_mobile   = COALESCE($10, contact_mobile),
        email            = COALESCE($11, email),
        customer_care_no = COALESCE($12, customer_care_no),
        msme_certificate = COALESCE($13, msme_certificate),
        gstin            = COALESCE($14, gstin),
        is_active        = COALESCE($15, is_active),
        updated_at       = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      mfr_name ? mfr_name.trim() : null,
      description        ?? null,
      brand_id           || null,
      licence_no         ?? null,
      address            ?? null,
      state              ?? null,
      city               ?? null,
      pincode            ?? null,
      contact_person     ?? null,
      contact_mobile     ?? null,
      email              ?? null,
      customer_care_no   ?? null,
      msme_certificate   ?? null,
      gstin              ?? null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Manufacturer not found' })

    const { rows: full } = await query(`${WITH_BRAND} WHERE m.id = $1`, [rows[0].id])
    res.json({ success: true, data: full[0] })
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

module.exports = {
  listManufacturers,
  getManufacturer,
  createManufacturer,
  updateManufacturer,
  deleteManufacturer
}
