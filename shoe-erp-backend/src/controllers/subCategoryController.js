const { query } = require('../config/db')

// ─── Auto-generate sub_catg_code: SUBCATG-0001, SUBCATG-0002 … ───────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(sub_catg_code FROM 8) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM sub_category_master
    WHERE sub_catg_code ~ '^SUBCATG-[0-9]+$'
  `)
  return `SUBCATG-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── Shared SELECT with JOINs ────────────────────────────────────────────────
const WITH_JOINS = `
  SELECT
    sc.*,
    c.category_name,
    c.catg_code,
    d.dept_name,
    d.dept_code
  FROM sub_category_master sc
  LEFT JOIN category_master    c ON sc.category_id = c.id
  LEFT JOIN department_master  d ON c.dept_id       = d.id
`

// ─── GET /api/sub-categories ──────────────────────────────────────────────────
const listSubCategories = async (req, res) => {
  try {
    const { search, category_id, is_active } = req.query
    const conditions = []
    const params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`sc.is_active = $${params.length}`)
    }

    if (category_id) {
      params.push(category_id)
      conditions.push(`sc.category_id = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(sc.sub_category_name ILIKE $${params.length} OR sc.sub_catg_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `${WITH_JOINS} ${where} ORDER BY sc.sub_catg_code NULLS LAST, sc.sub_category_name`,
      params
    )

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[subCategoryController] listSubCategories:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/sub-categories/:id ─────────────────────────────────────────────
const getSubCategory = async (req, res) => {
  try {
    const { rows } = await query(
      `${WITH_JOINS} WHERE sc.id = $1`,
      [req.params.id]
    )
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
    const { sub_category_name, description, category_id } = req.body

    if (!sub_category_name || !sub_category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Sub-category name is required' })
    }
    if (!category_id) {
      return res.status(400).json({ success: false, message: 'Category is required to save sub-category' })
    }

    const sub_catg_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO sub_category_master (sub_catg_code, sub_category_name, description, category_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [sub_catg_code, sub_category_name.trim(), description || null, category_id])

    // Re-fetch with JOINs
    const { rows: full } = await query(
      `${WITH_JOINS} WHERE sc.id = $1`,
      [rows[0].id]
    )

    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[subCategoryController] createSubCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/sub-categories/:id ──────────────────────────────────────────────
const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { sub_category_name, description, category_id, is_active } = req.body

    const { rows } = await query(`
      UPDATE sub_category_master SET
        sub_category_name = COALESCE($1, sub_category_name),
        description       = COALESCE($2, description),
        category_id       = COALESCE($3, category_id),
        is_active         = COALESCE($4, is_active),
        updated_at        = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      sub_category_name ? sub_category_name.trim() : null,
      description ?? null,
      category_id || null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Sub-category not found' })

    const { rows: full } = await query(
      `${WITH_JOINS} WHERE sc.id = $1`,
      [rows[0].id]
    )

    res.json({ success: true, data: full[0] })
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
