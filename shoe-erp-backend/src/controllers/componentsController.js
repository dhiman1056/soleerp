const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(comp_code FROM 7) AS INTEGER)), 0) + 1 AS next_num
    FROM components_master WHERE comp_code ~ '^CMPNT-[0-9]+$'
  `)
  return `CMPNT-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/components ──────────────────────────────────────────────────────
const listComponents = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(comp_name ILIKE $${params.length} OR comp_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`SELECT * FROM components_master ${where} ORDER BY comp_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[componentsController] listComponents:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/components/:id ──────────────────────────────────────────────────
const getComponent = async (req, res) => {
  try {
    const { rows } = await query(`SELECT * FROM components_master WHERE id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Component not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/components ─────────────────────────────────────────────────────
const createComponent = async (req, res) => {
  try {
    const { comp_name } = req.body
    if (!comp_name?.trim()) return res.status(400).json({ success: false, message: 'Component name is required' })

    const comp_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO components_master (comp_code, comp_name)
      VALUES ($1, $2) RETURNING *
    `, [comp_code, comp_name.trim()])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[componentsController] createComponent:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Component code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/components/:id ──────────────────────────────────────────────────
const updateComponent = async (req, res) => {
  try {
    const { id } = req.params
    const { comp_name, is_active } = req.body

    const { rows } = await query(`
      UPDATE components_master SET
        comp_name  = COALESCE($1, comp_name),
        is_active  = COALESCE($2, is_active),
        updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [
      comp_name ? comp_name.trim() : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Component not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[componentsController] updateComponent:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/components/:id (soft) ───────────────────────────────────────
const deleteComponent = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE components_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Component not found' })
    res.json({ success: true, message: 'Component deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listComponents, getComponent, createComponent, updateComponent, deleteComponent }
