const { query } = require('../config/db')

// ─── Auto-generate brand_code: BRAND-0001, BRAND-0002 … ──────────────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(brand_code FROM 7) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM brand_master
    WHERE brand_code ~ '^BRAND-[0-9]+$'
  `)
  return `BRAND-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/brands ──────────────────────────────────────────────────────────
const listBrands = async (req, res) => {
  try {
    const { search, is_active } = req.query
    let sql = 'SELECT * FROM brand_master WHERE 1=1'
    const params = []

    if (is_active === 'true' || is_active === true) {
      sql += ' AND is_active = true'
    } else if (is_active === 'false' || is_active === false) {
      sql += ' AND is_active = false'
    } else if (is_active !== 'all' && req.query.all !== 'true') {
      sql += ' AND is_active = true'
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`)
      sql += ` AND (brand_name ILIKE $${params.length} OR brand_code ILIKE $${params.length})`
    }

    sql += ' ORDER BY brand_code'

    const { rows } = await query(sql, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[brandController] listBrands:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/brands/:id ──────────────────────────────────────────────────────
const getBrand = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM brand_master
      WHERE id = $1
    `, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Brand not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[brandController] getBrand:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/brands ─────────────────────────────────────────────────────────
const createBrand = async (req, res) => {
  try {
    const { brand_name, discount } = req.body

    if (!brand_name || !brand_name.trim()) {
      return res.status(400).json({ success: false, message: 'Brand name is required' })
    }

    const brand_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO brand_master (brand_code, brand_name, discount)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [
      brand_code,
      brand_name.trim(),
      discount !== undefined && discount !== '' && discount !== null ? Number(discount) : 0
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[brandController] createBrand:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Brand name already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/brands/:id ──────────────────────────────────────────────────────
const updateBrand = async (req, res) => {
  try {
    const { id } = req.params
    const { brand_name, discount, is_active } = req.body

    const { rows } = await query(`
      UPDATE brand_master SET
        brand_name = COALESCE($1, brand_name),
        discount = COALESCE($2, discount),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [
      brand_name ? brand_name.trim() : null,
      discount !== undefined && discount !== '' && discount !== null ? Number(discount) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Brand not found' })

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[brandController] updateBrand:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/brands/:id (soft delete) ─────────────────────────────────────
const deleteBrand = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE brand_master
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Brand not found' })
    res.json({ success: true, message: 'Brand deactivated' })
  } catch (err) {
    console.error('[brandController] deleteBrand:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const importBrands = async (req, res) => {
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
      const brand_name = (row['Brand Description'] || row['Brand Name'] || row['brand_name'] || '').trim()
      const discount   = parseFloat(row['Discount %'] || row['discount'] || 0)

      if (!brand_name) {
        errors.push({ row: rowNum, message: 'Brand name/description is required' })
        continue
      }
      if (isNaN(discount) || discount < 0 || discount > 100) {
        errors.push({ row: rowNum, message: 'Discount % must be between 0 and 100' })
        continue
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM brand_master WHERE LOWER(brand_name) = LOWER($1)',
        [brand_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const brand_code = await generateCode()
      await query(`
        INSERT INTO brand_master (brand_code, brand_name, discount)
        VALUES ($1, $2, $3)
      `, [brand_code, brand_name, discount])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = { listBrands, getBrand, createBrand, updateBrand, deleteBrand, importBrands }
