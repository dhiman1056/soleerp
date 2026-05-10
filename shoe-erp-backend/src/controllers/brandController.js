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
    const { rows } = await query(`
      SELECT 
        b.*,
        c.company_name,
        c.company_code
      FROM brand_master b
      LEFT JOIN company_master c ON b.company_id = c.id
      WHERE b.is_active = true
      ORDER BY b.brand_code
    `)
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
      SELECT 
        b.*,
        c.company_name,
        c.company_code
      FROM brand_master b
      LEFT JOIN company_master c ON b.company_id = c.id
      WHERE b.id = $1
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
    const { brand_name, company_id, discount } = req.body

    if (!brand_name || !brand_name.trim()) {
      return res.status(400).json({ success: false, message: 'Brand name is required' })
    }

    const brand_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO brand_master 
      (brand_code, brand_name, company_id, discount)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [brand_code, brand_name.trim(), company_id || null, discount ? Number(discount) : 0])

    const { rows: full } = await query(`
      SELECT b.*, c.company_name, c.company_code
      FROM brand_master b
      LEFT JOIN company_master c ON b.company_id = c.id
      WHERE b.id = $1
    `, [rows[0].id])

    res.status(201).json({ success: true, data: full[0] })
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
    const { brand_name, company_id, discount, is_active } = req.body

    const { rows } = await query(`
      UPDATE brand_master SET
        brand_name = COALESCE($1, brand_name),
        company_id = COALESCE($2, company_id),
        discount = COALESCE($3, discount),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      brand_name ? brand_name.trim() : null,
      company_id || null,
      discount !== undefined && discount !== '' ? Number(discount) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Brand not found' })

    const { rows: full } = await query(`
      SELECT b.*, c.company_name, c.company_code
      FROM brand_master b
      LEFT JOIN company_master c ON b.company_id = c.id
      WHERE b.id = $1
    `, [rows[0].id])

    res.json({ success: true, data: full[0] })
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

module.exports = { listBrands, getBrand, createBrand, updateBrand, deleteBrand }
