const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(design_master_code FROM 8) AS INTEGER)), 0) + 1 AS next_num
    FROM design_master WHERE design_master_code ~ '^DESIGN-[0-9]+$'
  `)
  return `DESIGN-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/designs ─────────────────────────────────────────────────────────
const listDesigns = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(design_no ILIKE $${params.length} OR design_name ILIKE $${params.length} OR design_master_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(
      `SELECT * FROM design_master ${where} ORDER BY design_master_code NULLS LAST, design_no`,
      params
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[designController] listDesigns:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/designs/:id ─────────────────────────────────────────────────────
const getDesign = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM design_master WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Design not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/designs ────────────────────────────────────────────────────────
const createDesign = async (req, res) => {
  try {
    const { design_no, design_name, description } = req.body
    if (!design_no?.trim())   return res.status(400).json({ success: false, message: 'Design No is required' })
    if (!design_name?.trim()) return res.status(400).json({ success: false, message: 'Design Name is required' })

    const design_master_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO design_master (design_master_code, design_no, design_name, description)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [design_master_code, design_no.trim(), design_name.trim(), description || null])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[designController] createDesign:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Design No already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/designs/:id ─────────────────────────────────────────────────────
const updateDesign = async (req, res) => {
  try {
    const { id } = req.params
    const { design_no, design_name, description, is_active } = req.body

    const { rows } = await query(`
      UPDATE design_master SET
        design_no   = COALESCE($1, design_no),
        design_name = COALESCE($2, design_name),
        description = COALESCE($3, description),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5 RETURNING *
    `, [
      design_no   ? design_no.trim()   : null,
      design_name ? design_name.trim() : null,
      description ?? null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Design not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[designController] updateDesign:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/designs/:id (soft) ──────────────────────────────────────────
const deleteDesign = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE design_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Design not found' })
    res.json({ success: true, message: 'Design deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listDesigns, getDesign, createDesign, updateDesign, deleteDesign }
