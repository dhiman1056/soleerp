const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(div_code FROM 5) AS INTEGER)), 0) + 1 AS next_num
    FROM division_master WHERE div_code ~ '^DIV-[0-9]+$'
  `)
  return `DIV-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/divisions ───────────────────────────────────────────────────────
const listDivisions = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(div_name ILIKE $${params.length} OR div_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`SELECT * FROM division_master ${where} ORDER BY div_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[divisionController] listDivisions:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/divisions/:id ───────────────────────────────────────────────────
const getDivision = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM division_master WHERE id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Division not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/divisions ──────────────────────────────────────────────────────
const createDivision = async (req, res) => {
  try {
    const { div_name } = req.body
    if (!div_name?.trim())
      return res.status(400).json({ success: false, message: 'Division name is required' })

    const div_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO division_master (div_code, div_name)
      VALUES ($1, $2) RETURNING *
    `, [div_code, div_name.trim()])

    res.status(201).json({ success: true, data: rows[0] })
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
    const { div_name, is_active } = req.body

    const { rows } = await query(`
      UPDATE division_master SET
        div_name   = COALESCE($1, div_name),
        is_active   = COALESCE($2, is_active),
        updated_at  = NOW()
      WHERE id = $3 RETURNING *
    `, [
      div_name ? div_name.trim() : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Division not found' })
    res.json({ success: true, data: rows[0] })
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
