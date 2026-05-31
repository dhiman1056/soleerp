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
    const { search, location_type, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (location_type) {
      params.push(location_type)
      conditions.push(`location_type = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(location_name ILIKE $${params.length} OR location_code ILIKE $${params.length} OR loc_master_code ILIKE $${params.length})`)
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
    const { location_name, location_type, description } = req.body

    if (!location_name?.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Location name is required' 
      })
    }
    if (!location_type?.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Location type is required' 
      })
    }

    const loc_master_code = await generateCode()
    const location_code = loc_master_code

    const { rows } = await query(`
      INSERT INTO location_master (
        loc_master_code, location_code, location_name, 
        location_type, description
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      loc_master_code,
      location_code,
      location_name.trim(),
      location_type.trim(),
      description ? description.trim() : null
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
    const { location_name, location_type, description, is_active } = req.body

    if (location_name !== undefined && !location_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Location name is required' })
    }
    if (location_type !== undefined && !location_type?.trim()) {
      return res.status(400).json({ success: false, message: 'Location type is required' })
    }

    const { rows } = await query(`
      UPDATE location_master SET
        location_name = COALESCE($1, location_name),
        location_type = COALESCE($2, location_type),
        description   = COALESCE($3, description),
        is_active     = COALESCE($4, is_active),
        updated_at    = NOW()
      WHERE id = $5 RETURNING *
    `, [
      location_name ? location_name.trim() : null,
      location_type ? location_type.trim() : null,
      description !== undefined ? (description ? description.trim() : null) : null,
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

module.exports = {
  listLocations,
  getLocation,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
}
