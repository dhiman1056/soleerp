const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(comp_code FROM 7) AS INTEGER)), 0) + 1 AS next_num
    FROM components_master WHERE comp_code ~ '^CMPNT-[0-9]+$'
  `)
  return `CMPNT-${String(rows[0].next_num).padStart(4, '0')}`
}

const WITH_DESIGN = `
  SELECT
    c.*,
    d.design_no,
    d.design_name,
    d.design_master_code
  FROM components_master c
  LEFT JOIN design_master d ON c.design_id = d.id
`

// ─── GET /api/components ──────────────────────────────────────────────────────
const listComponents = async (req, res) => {
  try {
    const { search, design_id, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`c.is_active = $${params.length}`)
    }
    if (design_id) {
      params.push(design_id)
      conditions.push(`c.design_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(c.comp_name ILIKE $${params.length} OR c.comp_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`${WITH_DESIGN} ${where} ORDER BY c.comp_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[componentsController] listComponents:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/components/:id ──────────────────────────────────────────────────
const getComponent = async (req, res) => {
  try {
    const { rows } = await query(`${WITH_DESIGN} WHERE c.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Component not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/components ─────────────────────────────────────────────────────
const createComponent = async (req, res) => {
  try {
    const { comp_name, description, design_id } = req.body
    if (!comp_name?.trim()) return res.status(400).json({ success: false, message: 'Component name is required' })

    const comp_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO components_master (comp_code, comp_name, description, design_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [comp_code, comp_name.trim(), description || null, design_id || null])

    const { rows: full } = await query(`${WITH_DESIGN} WHERE c.id = $1`, [rows[0].id])
    res.status(201).json({ success: true, data: full[0] })
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
    const { comp_name, description, design_id, is_active } = req.body

    const { rows } = await query(`
      UPDATE components_master SET
        comp_name   = COALESCE($1, comp_name),
        description = COALESCE($2, description),
        design_id   = COALESCE($3, design_id),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5 RETURNING *
    `, [
      comp_name ? comp_name.trim() : null,
      description ?? null,
      design_id || null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Component not found' })
    const { rows: full } = await query(`${WITH_DESIGN} WHERE c.id = $1`, [rows[0].id])
    res.json({ success: true, data: full[0] })
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
