const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(div_code FROM 5) AS INTEGER)), 0) + 1 AS next_num
    FROM division_master WHERE div_code ~ '^DIV-[0-9]+$'
  `)
  return `DIV-${String(rows[0].next_num).padStart(4, '0')}`
}

const WITH_LOCATION = `
  SELECT
    d.*,
    l.location_name,
    l.location_code
  FROM division_master d
  LEFT JOIN location_master l ON d.location_id = l.id
`

// ─── GET /api/divisions ───────────────────────────────────────────────────────
const listDivisions = async (req, res) => {
  try {
    const { search, location_id, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`d.is_active = $${params.length}`)
    }
    if (location_id) {
      params.push(location_id)
      conditions.push(`d.location_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(d.div_name ILIKE $${params.length} OR d.div_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`${WITH_LOCATION} ${where} ORDER BY d.div_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[divisionController] listDivisions:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/divisions/:id ───────────────────────────────────────────────────
const getDivision = async (req, res) => {
  try {
    const { rows } = await query(`${WITH_LOCATION} WHERE d.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Division not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/divisions ──────────────────────────────────────────────────────
const createDivision = async (req, res) => {
  try {
    const { div_name, description, location_id } = req.body
    if (!div_name?.trim())
      return res.status(400).json({ success: false, message: 'Division name is required' })
    if (!location_id)
      return res.status(400).json({ success: false, message: 'Location is required to save division' })

    const div_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO division_master (div_code, div_name, description, location_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [div_code, div_name.trim(), description || null, location_id])

    const { rows: full } = await query(`${WITH_LOCATION} WHERE d.id = $1`, [rows[0].id])
    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[divisionController] createDivision:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Division code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/divisions/:id ───────────────────────────────────────────────────
const updateDivision = async (req, res) => {
  try {
    const { id } = req.params
    const { div_name, description, location_id, is_active } = req.body

    const { rows } = await query(`
      UPDATE division_master SET
        div_name    = COALESCE($1, div_name),
        description = COALESCE($2, description),
        location_id = COALESCE($3, location_id),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5 RETURNING *
    `, [
      div_name ? div_name.trim() : null,
      description ?? null,
      location_id || null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Division not found' })
    const { rows: full } = await query(`${WITH_LOCATION} WHERE d.id = $1`, [rows[0].id])
    res.json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[divisionController] updateDivision:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/divisions/:id (soft) ────────────────────────────────────────
const deleteDivision = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE division_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Division not found' })
    res.json({ success: true, message: 'Division deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listDivisions, getDivision, createDivision, updateDivision, deleteDivision }
