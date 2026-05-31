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

// ─── GET /api/categories ──────────────────────────────────────────────────────
const listCategories = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        c.*,
        d.dept_name,
        d.dept_code
      FROM category_master c
      LEFT JOIN department_master d ON c.dept_id = d.id
      WHERE c.is_active = true
      ORDER BY c.catg_code
    `)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[categoryController] listCategories:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/categories/:id ──────────────────────────────────────────────────
const getCategory = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        c.*,
        d.dept_name,
        d.dept_code
      FROM category_master c
      LEFT JOIN department_master d ON c.dept_id = d.id
      WHERE c.id = $1
    `, [req.params.id])
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
    const { catg_name, dept_id, discount } = req.body

    if (!catg_name || !catg_name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' })
    }

    const catg_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO category_master (catg_code, catg_name, dept_id, discount)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [catg_code, catg_name.trim().toUpperCase(), dept_id || null, discount ? Number(discount) : 0])

    const { rows: full } = await query(`
      SELECT c.*, d.dept_name, d.dept_code
      FROM category_master c
      LEFT JOIN department_master d ON c.dept_id = d.id
      WHERE c.id = $1
    `, [rows[0].id])

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
    const { catg_name, dept_id, discount, is_active } = req.body

    const { rows } = await query(`
      UPDATE category_master SET
        catg_name = COALESCE($1, catg_name),
        dept_id = COALESCE($2, dept_id),
        discount = COALESCE($3, discount),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      catg_name ? catg_name.trim().toUpperCase() : null,
      dept_id || null,
      discount !== undefined && discount !== '' ? Number(discount) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' })

    const { rows: full } = await query(`
      SELECT c.*, d.dept_name, d.dept_code
      FROM category_master c
      LEFT JOIN department_master d ON c.dept_id = d.id
      WHERE c.id = $1
    `, [rows[0].id])

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

const importCategories = async (req, res) => {
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
      const catg_name = (row['Category Description'] || '').trim()
      const dept_name = (row['Department Name'] || '').trim()
      const discount  = parseFloat(row['Discount %'] || 0)

      if (!catg_name) {
        errors.push({ row: rowNum, message: 'Category Description is required' })
        continue
      }
      if (isNaN(discount) || discount < 0 || discount > 100) {
        errors.push({ row: rowNum, message: 'Discount % must be between 0 and 100' })
        continue
      }

      // Resolve department name → dept_id (optional)
      let dept_id = null
      if (dept_name) {
        const deptRes = await query(
          'SELECT id FROM department_master WHERE LOWER(dept_name) = LOWER($1) AND is_active = true',
          [dept_name]
        )
        if (deptRes.rows.length === 0) {
          errors.push({ row: rowNum,
            message: `Department "${dept_name}" not found. Create it first in Department Master.` })
          continue
        }
        dept_id = deptRes.rows[0].id
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM category_master WHERE LOWER(catg_name) = LOWER($1)',
        [catg_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const catg_code = await generateCode()
      await query(`
        INSERT INTO category_master (catg_code, catg_name, dept_id, discount)
        VALUES ($1, $2, $3, $4)
      `, [catg_code, catg_name.toUpperCase(), dept_id, discount])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  importCategories
}
