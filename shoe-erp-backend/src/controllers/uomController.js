const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(uom_master_code FROM 5) AS INTEGER)), 0) + 1 AS next_num
    FROM uom_master WHERE uom_master_code ~ '^UOM-[0-9]+$'
  `)
  return `UOM-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/uom ─────────────────────────────────────────────────────────────
const listUOMs = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(uom_name ILIKE $${params.length} OR uom_code ILIKE $${params.length} OR uom_master_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(
      `SELECT * FROM uom_master ${where} ORDER BY uom_master_code NULLS LAST, uom_code`,
      params
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[uomController] listUOMs:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/uom/:id ─────────────────────────────────────────────────────────
const getUOM = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM uom_master WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'UOM not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/uom ────────────────────────────────────────────────────────────
const createUOM = async (req, res) => {
  try {
    const { uom_code, uom_name, description, pack_size = 1, pack_size_unit } = req.body

    if (!uom_code?.trim()) return res.status(400).json({ success: false, message: 'UOM code is required' })
    if (!uom_name?.trim()) return res.status(400).json({ success: false, message: 'UOM name is required' })

    const uom_master_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO uom_master (uom_master_code, uom_code, uom_name, description, pack_size, pack_size_unit)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [
      uom_master_code,
      uom_code.trim().toUpperCase(),
      uom_name.trim(),
      description || null,
      parseFloat(pack_size) || 1,
      pack_size_unit || null
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[uomController] createUOM:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'UOM code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/uom/:id ─────────────────────────────────────────────────────────
const updateUOM = async (req, res) => {
  try {
    const { id } = req.params
    const { uom_code, uom_name, description, pack_size, pack_size_unit, is_active } = req.body

    const { rows } = await query(`
      UPDATE uom_master SET
        uom_code       = COALESCE($1, uom_code),
        uom_name       = COALESCE($2, uom_name),
        description    = COALESCE($3, description),
        pack_size      = COALESCE($4, pack_size),
        pack_size_unit = COALESCE($5, pack_size_unit),
        is_active      = COALESCE($6, is_active),
        updated_at     = NOW()
      WHERE id = $7 RETURNING *
    `, [
      uom_code ? uom_code.trim().toUpperCase() : null,
      uom_name ? uom_name.trim() : null,
      description ?? null,
      pack_size !== undefined ? parseFloat(pack_size) || 1 : null,
      pack_size_unit ?? null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'UOM not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[uomController] updateUOM:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/uom/:id (soft) ───────────────────────────────────────────────
const deleteUOM = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE uom_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'UOM not found' })
    res.json({ success: true, message: 'UOM deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listUOMs, getUOM, createUOM, updateUOM, deleteUOM }
