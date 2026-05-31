const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(color_master_code FROM 7) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM color_master
    WHERE color_master_code ~ '^COLOR-[0-9]+$'
  `)
  return `COLOR-${String(rows[0].next_num).padStart(4, '0')}`
}

// GET /api/colors
const listColors = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(color_name ILIKE $${params.length} OR color_code ILIKE $${params.length} OR color_master_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`
      SELECT * FROM color_master
      ${where}
      ORDER BY color_master_code NULLS LAST
    `, params)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[colorController] listColors:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// GET /api/colors/:id
const getColor = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM color_master
      WHERE id = $1
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Color not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[colorController] getColor:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// POST /api/colors
const createColor = async (req, res) => {
  try {
    const { color_code, color_name, hex_code } = req.body

    if (!color_code?.trim()) {
      return res.status(400).json({ success: false, message: 'Color code is required' })
    }
    if (!color_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Color name is required' })
    }

    // Check duplicate color_code
    const { rows: duplicate } = await query(`
      SELECT id FROM color_master WHERE color_code = $1
    `, [color_code.trim().toUpperCase()])
    
    if (duplicate.length) {
      return res.status(400).json({ success: false, message: 'Color code already exists' })
    }

    const color_master_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO color_master (color_master_code, color_code, color_name, hex_code)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [
      color_master_code,
      color_code.trim().toUpperCase(),
      color_name.trim(),
      hex_code ? hex_code.trim() : null
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[colorController] createColor:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// PUT /api/colors/:id
const updateColor = async (req, res) => {
  try {
    const { id } = req.params
    const { color_code, color_name, hex_code, is_active } = req.body

    if (color_code !== undefined && !color_code?.trim()) {
      return res.status(400).json({ success: false, message: 'Color code is required' })
    }
    if (color_name !== undefined && !color_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Color name is required' })
    }

    if (color_code) {
      // Check duplicate color_code for other color entries
      const { rows: duplicate } = await query(`
        SELECT id FROM color_master WHERE color_code = $1 AND id <> $2
      `, [color_code.trim().toUpperCase(), id])
      
      if (duplicate.length) {
        return res.status(400).json({ success: false, message: 'Color code already exists' })
      }
    }

    const { rows } = await query(`
      UPDATE color_master SET
        color_code = COALESCE($1, color_code),
        color_name = COALESCE($2, color_name),
        hex_code = COALESCE($3, hex_code),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      color_code ? color_code.trim().toUpperCase() : null,
      color_name ? color_name.trim() : null,
      hex_code !== undefined ? (hex_code ? hex_code.trim() : null) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Color not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[colorController] updateColor:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// DELETE /api/colors/:id (soft delete)
const deleteColor = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE color_master 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1 RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Color not found' })
    res.json({ success: true, message: 'Color deactivated' })
  } catch (err) {
    console.error('[colorController] deleteColor:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const importColors = async (req, res) => {
  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'No rows provided' })
  }

  let imported = 0, skipped = 0
  const errors = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNum = i + 1
    try {
      const color_code = (row['Color Code'] || '').trim().toUpperCase()
      const color_name = (row['Color Name'] || '').trim()
      const hex_code   = (row['Hex Code']   || '').trim()

      if (!color_code) {
        errors.push({ row: rowNum, message: 'Color Code is required' })
        continue
      }
      if (!color_name) {
        errors.push({ row: rowNum, message: 'Color Name is required' })
        continue
      }
      if (hex_code && !/^#[0-9A-Fa-f]{6}$/.test(hex_code)) {
        errors.push({ row: rowNum,
          message: 'Hex Code must be in format #RRGGBB e.g. #FF0000' })
        continue
      }

      // Skip duplicate on color_code
      const dup = await query(
        'SELECT id FROM color_master WHERE UPPER(color_code) = UPPER($1)',
        [color_code]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const color_master_code = await generateCode()
      await query(`
        INSERT INTO color_master
          (color_master_code, color_code, color_name, hex_code)
        VALUES ($1, $2, $3, $4)
      `, [color_master_code, color_code, color_name, hex_code || null])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listColors,
  getColor,
  createColor,
  updateColor,
  deleteColor,
  importColors
}
