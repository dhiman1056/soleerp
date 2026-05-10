const { query } = require('../config/db')

// ─── Auto-generate sub_catg_code: SUBCATG-0001, SUBCATG-0002 … ───────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(sub_catg_code FROM 9) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM sub_category_master
    WHERE sub_catg_code ~ '^SUBCATG-[0-9]+$'
  `)
  return `SUBCATG-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/sub-categories ──────────────────────────────────────────────────
const listSubCategories = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM sub_category_master
      WHERE is_active = true
      ORDER BY sub_catg_code
    `)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[subCategoryController] listSubCategories:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/sub-categories/:id ─────────────────────────────────────────────
const getSubCategory = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM sub_category_master
      WHERE id = $1
    `, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Sub-category not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[subCategoryController] getSubCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/sub-categories ─────────────────────────────────────────────────
const createSubCategory = async (req, res) => {
  try {
    const { sub_category_name, discount } = req.body

    if (!sub_category_name || !sub_category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Sub-category name is required' })
    }

    const sub_catg_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO sub_category_master (sub_catg_code, sub_category_name, discount)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [sub_catg_code, sub_category_name.trim(), discount ? Number(discount) : 0])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[subCategoryController] createSubCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/sub-categories/:id ──────────────────────────────────────────────
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { sub_category_name, discount, is_active } = req.body

    const { rows } = await query(`
      UPDATE sub_category_master SET
        sub_category_name = COALESCE($1, sub_category_name),
        discount = COALESCE($2, discount),
        is_active = COALESCE($3, is_active),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [
      sub_category_name ? sub_category_name.trim() : null,
      discount !== undefined && discount !== '' ? Number(discount) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Sub-category not found' })

    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[subCategoryController] updateSubCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/sub-categories/:id (soft delete) ────────────────────────────
const deleteSubCategory = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE sub_category_master
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Sub-category not found' })
    res.json({ success: true, message: 'Sub-category deactivated' })
  } catch (err) {
    console.error('[subCategoryController] deleteSubCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  listSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory
}
