const { query } = require('../config/db')

// ─── Auto-generate catg_code: CATG-0001, CATG-0002 … ─────────────────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(catg_code FROM 6) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM category_master
    WHERE catg_code ~ '^CATG-[0-9]+$'
  `)
  return `CATG-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── Shared JOIN helper ───────────────────────────────────────────────────────
const WITH_DEPT = `
  SELECT
    c.*,
    d.dept_name,
    d.dept_code
  FROM category_master c
  LEFT JOIN department_master d ON c.dept_id = d.id
`

// ─── GET /api/categories ──────────────────────────────────────────────────────
const listCategories = async (req, res) => {
  try {
    const { search, dept_id, is_active } = req.query
    const conditions = []
    const params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`c.is_active = $${params.length}`)
    }

    if (dept_id) {
      params.push(dept_id)
      conditions.push(`c.dept_id = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(c.category_name ILIKE $${params.length} OR c.catg_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `${WITH_DEPT} ${where} ORDER BY c.catg_code`,
      params
    )

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[categoryController] listCategories:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/categories/:id ──────────────────────────────────────────────────
const getCategory = async (req, res) => {
  try {
    const { rows } = await query(
      `${WITH_DEPT} WHERE c.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[categoryController] getCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/categories ─────────────────────────────────────────────────────
const createCategory = async (req, res) => {
  try {
    const { category_name, description, dept_id } = req.body

    if (!category_name || !category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' })
    }
    if (!dept_id) {
      return res.status(400).json({ success: false, message: 'Department is required to save category' })
    }

    const catg_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO category_master (catg_code, category_name, description, dept_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [catg_code, category_name.trim().toUpperCase(), description || null, dept_id])

    // Re-fetch with JOIN so we return dept info immediately
    const { rows: full } = await query(
      `${WITH_DEPT} WHERE c.id = $1`,
      [rows[0].id]
    )

    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[categoryController] createCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/categories/:id ──────────────────────────────────────────────────
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { category_name, description, dept_id, is_active } = req.body

    const { rows } = await query(`
      UPDATE category_master SET
        category_name = COALESCE($1, category_name),
        description   = COALESCE($2, description),
        dept_id       = COALESCE($3, dept_id),
        is_active     = COALESCE($4, is_active),
        updated_at    = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      category_name ? category_name.trim().toUpperCase() : null,
      description ?? null,
      dept_id || null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' })

    const { rows: full } = await query(
      `${WITH_DEPT} WHERE c.id = $1`,
      [rows[0].id]
    )

    res.json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[categoryController] updateCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/categories/:id (soft delete) ─────────────────────────────────
const deleteCategory = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE category_master
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' })
    res.json({ success: true, message: 'Category deactivated' })
  } catch (err) {
    console.error('[categoryController] deleteCategory:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
}
