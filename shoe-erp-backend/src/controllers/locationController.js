const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(loc_master_code FROM 5) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM location_master
    WHERE loc_master_code ~ '^LOC-[0-9]+$'
  `)
  return `LOC-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/locations ───────────────────────────────────────────────────────
const listLocations = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    } else {
      conditions.push(`is_active = true`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(location_name ILIKE $${params.length} OR location_code ILIKE $${params.length} OR loc_master_code ILIKE $${params.length} OR contact_name ILIKE $${params.length} OR city ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`
      SELECT * FROM location_master
      ${where}
      ORDER BY loc_master_code NULLS LAST, location_name
    `, params)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[locationController] listLocations:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/locations/:id ───────────────────────────────────────────────────
const getLocation = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM location_master WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Location not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[locationController] getLocation:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const getLocationById = getLocation

// ─── POST /api/locations ──────────────────────────────────────────────────────
const createLocation = async (req, res) => {
  try {
    const { 
      location_name, address, city, state, 
      pincode, contact_name, contact_email, 
      contact_mobile 
    } = req.body

    if (!location_name?.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Location name is required' 
      })
    }

    const loc_master_code = await generateCode()
    const location_code = loc_master_code
    const location_type = 'OTHER' // Default as requested

    const { rows } = await query(`
      INSERT INTO location_master (
        loc_master_code, location_code, location_name, location_type,
        address, city, state, pincode,
        contact_name, contact_email, contact_mobile
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      loc_master_code,
      location_code,
      location_name.trim(),
      location_type,
      address ? address.trim() : null,
      city ? city.trim() : null,
      state ? state.trim() : null,
      pincode ? pincode.trim() : null,
      contact_name ? contact_name.trim() : null,
      contact_email ? contact_email.trim().toLowerCase() : null,
      contact_mobile ? contact_mobile.trim() : null
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Location code already exists' })
    console.error('[locationController] createLocation:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/locations/:id ───────────────────────────────────────────────────
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params
    const { 
      location_name, address, city, state, 
      pincode, contact_name, contact_email, 
      contact_mobile, is_active 
    } = req.body

    if (location_name !== undefined && !location_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Location name is required' })
    }

    const { rows } = await query(`
      UPDATE location_master SET
        location_name = COALESCE($1, location_name),
        address = COALESCE($2, address),
        city = COALESCE($3, city),
        state = COALESCE($4, state),
        pincode = COALESCE($5, pincode),
        contact_name = COALESCE($6, contact_name),
        contact_email = COALESCE($7, contact_email),
        contact_mobile = COALESCE($8, contact_mobile),
        is_active = COALESCE($9, is_active),
        updated_at = NOW()
      WHERE id = $10 RETURNING *
    `, [
      location_name ? location_name.trim() : null,
      address !== undefined ? (address ? address.trim() : null) : null,
      city !== undefined ? (city ? city.trim() : null) : null,
      state !== undefined ? (state ? state.trim() : null) : null,
      pincode !== undefined ? (pincode ? pincode.trim() : null) : null,
      contact_name !== undefined ? (contact_name ? contact_name.trim() : null) : null,
      contact_email !== undefined ? (contact_email ? contact_email.trim().toLowerCase() : null) : null,
      contact_mobile !== undefined ? (contact_mobile ? contact_mobile.trim() : null) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Location not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[locationController] updateLocation:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/locations/:id ────────────────────────────────────────────────
const deleteLocation = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE location_master 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1 RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Location not found' })
    res.json({ success: true, message: 'Location deactivated' })
  } catch (err) {
    console.error('[locationController] deleteLocation:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const importLocations = async (req, res) => {
  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'No rows provided' })
  }

  const VALID_TYPES = [
    'Raw Material Store', 'Semi-Finished Store',
    'Finished Goods Warehouse', 'WIP Store',
    'Rejection Store', 'Dispatch Area', 'Other'
  ]

  let imported = 0, skipped = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    try {
      const location_name = (row['Location Name'] || row['location_name'] || '').trim()
      const location_type = (row['Location Type'] || row['location_type'] || 'Other').trim()
      const description   = (row['Description']   || row['description']   || '').trim()

      if (!location_name) {
        errors.push({ row: rowNum, message: 'Location Name is required' })
        continue
      }
      if (!VALID_TYPES.includes(location_type)) {
        errors.push({
          row: rowNum,
          message: `Invalid Location Type "${location_type}". Must be one of: ${VALID_TYPES.join(' | ')}`
        })
        continue
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM location_master WHERE LOWER(location_name) = LOWER($1)',
        [location_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const loc_master_code = await generateCode()
      await query(`
        INSERT INTO location_master
          (loc_master_code, location_code, location_name, location_type, description)
        VALUES ($1, $2, $3, $4, $5)
      `, [loc_master_code, loc_master_code, location_name,
          location_type, description || null])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listLocations,
  getLocation,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation,
  importLocations
}
