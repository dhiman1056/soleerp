const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(gst_code FROM 5) AS INTEGER)), 0) + 1 AS next_num
    FROM gst_master WHERE gst_code ~ '^GST-[0-9]+$'
  `)
  return `GST-${String(rows[0].next_num).padStart(4, '0')}`
}

const calcRates = (gst_rate) => ({
  sgst_rate: gst_rate / 2,
  cgst_rate: gst_rate / 2,
  igst_rate: gst_rate,
})

// ─── GET /api/gst ─────────────────────────────────────────────────────────────
const listGST = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(description ILIKE $${params.length} OR gst_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`SELECT * FROM gst_master ${where} ORDER BY gst_rate ASC`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[gstController] listGST:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/gst/:id ─────────────────────────────────────────────────────────
const getGST = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM gst_master WHERE id = $1', [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'GST record not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/gst ────────────────────────────────────────────────────────────
const createGST = async (req, res) => {
  try {
    const { description } = req.body
    if (!description?.trim()) return res.status(400).json({ success: false, message: 'Description is required' })

    const gst_rate = parseFloat(req.body.gst_rate) || 0
    const { sgst_rate, cgst_rate, igst_rate } = calcRates(gst_rate)
    const gst_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO gst_master (gst_code, description, gst_rate, sgst_rate, cgst_rate, igst_rate)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [gst_code, description.trim(), gst_rate, sgst_rate, cgst_rate, igst_rate])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[gstController] createGST:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'GST code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/gst/:id ─────────────────────────────────────────────────────────
const updateGST = async (req, res) => {
  try {
    const { id } = req.params
    const { description, is_active } = req.body

    // If gst_rate supplied, recalculate; otherwise leave unchanged
    const hasRate = req.body.gst_rate !== undefined
    const gst_rate = hasRate ? parseFloat(req.body.gst_rate) || 0 : null
    const rates = hasRate ? calcRates(gst_rate) : { sgst_rate: null, cgst_rate: null, igst_rate: null }

    const { rows } = await query(`
      UPDATE gst_master SET
        description = COALESCE($1, description),
        gst_rate    = COALESCE($2, gst_rate),
        sgst_rate   = COALESCE($3, sgst_rate),
        cgst_rate   = COALESCE($4, cgst_rate),
        igst_rate   = COALESCE($5, igst_rate),
        is_active   = COALESCE($6, is_active),
        updated_at  = NOW()
      WHERE id = $7 RETURNING *
    `, [
      description ? description.trim() : null,
      gst_rate,
      rates.sgst_rate, rates.cgst_rate, rates.igst_rate,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'GST record not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[gstController] updateGST:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/gst/:id (soft) ───────────────────────────────────────────────
const deleteGST = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE gst_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'GST record not found' })
    res.json({ success: true, message: 'GST record deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listGST, getGST, createGST, updateGST, deleteGST }
