const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(hsn_master_code FROM 5) AS INTEGER)), 0) + 1 AS next_num
    FROM hsn_master WHERE hsn_master_code ~ '^HSN-[0-9]+$'
  `)
  return `HSN-${String(rows[0].next_num).padStart(4, '0')}`
}

const WITH_GST = `
  SELECT
    h.*,
    g.description  AS gst_description,
    g.gst_rate     AS gst_rate_from_master
  FROM hsn_master h
  LEFT JOIN gst_master g ON h.gst_id = g.id
`

// ─── GET /api/hsn ─────────────────────────────────────────────────────────────
const listHSN = async (req, res) => {
  try {
    const { search, gst_id, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`h.is_active = $${params.length}`)
    }
    if (gst_id) {
      params.push(gst_id)
      conditions.push(`h.gst_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(h.hsn_code ILIKE $${params.length} OR h.description ILIKE $${params.length} OR h.hsn_master_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`${WITH_GST} ${where} ORDER BY h.hsn_master_code NULLS LAST, h.hsn_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[hsnController] listHSN:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/hsn/:id ─────────────────────────────────────────────────────────
const getHSN = async (req, res) => {
  try {
    const { rows } = await query(`${WITH_GST} WHERE h.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'HSN record not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/hsn ────────────────────────────────────────────────────────────
const createHSN = async (req, res) => {
  try {
    const { hsn_code, description, gst_id } = req.body
    if (!hsn_code?.trim())    return res.status(400).json({ success: false, message: 'HSN code is required' })
    if (!description?.trim()) return res.status(400).json({ success: false, message: 'Description is required' })

    // Fetch rates from gst_master if gst_id provided
    let gst_rate = 0, sgst_rate = 0, cgst_rate = 0, igst_rate = 0
    if (gst_id) {
      const { rows: gstRows } = await query('SELECT * FROM gst_master WHERE id = $1', [gst_id])
      if (gstRows.length) {
        const g = gstRows[0]
        gst_rate  = parseFloat(g.gst_rate)  || 0
        sgst_rate = parseFloat(g.sgst_rate) || 0
        cgst_rate = parseFloat(g.cgst_rate) || 0
        igst_rate = parseFloat(g.igst_rate) || 0
      }
    }

    const hsn_master_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO hsn_master (hsn_master_code, hsn_code, description, gst_id, gst_rate, sgst_rate, cgst_rate, igst_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *
    `, [hsn_master_code, hsn_code.trim(), description.trim(), gst_id || null, gst_rate, sgst_rate, cgst_rate, igst_rate])

    const { rows: full } = await query(`${WITH_GST} WHERE h.id = $1`, [rows[0].id])
    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[hsnController] createHSN:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'HSN code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/hsn/:id ─────────────────────────────────────────────────────────
const updateHSN = async (req, res) => {
  try {
    const { id } = req.params
    const { hsn_code, description, gst_id, is_active } = req.body

    // Re-fetch GST rates if gst_id changed
    let gst_rate = null, sgst_rate = null, cgst_rate = null, igst_rate = null
    if (gst_id !== undefined) {
      if (gst_id) {
        const { rows: gstRows } = await query('SELECT * FROM gst_master WHERE id = $1', [gst_id])
        if (gstRows.length) {
          const g = gstRows[0]
          gst_rate  = parseFloat(g.gst_rate)
          sgst_rate = parseFloat(g.sgst_rate)
          cgst_rate = parseFloat(g.cgst_rate)
          igst_rate = parseFloat(g.igst_rate)
        }
      } else {
        gst_rate = 0; sgst_rate = 0; cgst_rate = 0; igst_rate = 0
      }
    }

    const { rows } = await query(`
      UPDATE hsn_master SET
        hsn_code   = COALESCE($1, hsn_code),
        description= COALESCE($2, description),
        gst_id     = COALESCE($3, gst_id),
        gst_rate   = COALESCE($4, gst_rate),
        sgst_rate  = COALESCE($5, sgst_rate),
        cgst_rate  = COALESCE($6, cgst_rate),
        igst_rate  = COALESCE($7, igst_rate),
        is_active  = COALESCE($8, is_active),
        updated_at = NOW()
      WHERE id = $9 RETURNING *
    `, [
      hsn_code ? hsn_code.trim() : null,
      description ? description.trim() : null,
      gst_id !== undefined ? (gst_id || null) : null,
      gst_rate, sgst_rate, cgst_rate, igst_rate,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'HSN record not found' })
    const { rows: full } = await query(`${WITH_GST} WHERE h.id = $1`, [rows[0].id])
    res.json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[hsnController] updateHSN:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/hsn/:id (soft) ───────────────────────────────────────────────
const deleteHSN = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE hsn_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'HSN record not found' })
    res.json({ success: true, message: 'HSN record deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = { listHSN, getHSN, createHSN, updateHSN, deleteHSN }
