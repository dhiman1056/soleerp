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
    const { search, category_id, is_active, all, include_inactive } = req.query
    const conditions = []
    const params = []

    if (is_active === 'true' || is_active === true) {
      params.push(true)
      conditions.push(`sc.is_active = $${params.length}`)
    } else if (is_active === 'false' || is_active === false) {
      params.push(false)
      conditions.push(`sc.is_active = $${params.length}`)
    } else if (is_active === 'all' || all === 'true' || include_inactive === 'true') {
      // Return both active and inactive
    } else {
      // Default: active only (preserves dropdown behavior)
      conditions.push(`sc.is_active = true`)
    }

    if (category_id) {
      params.push(category_id)
      conditions.push(`sc.category_id = $${params.length}`)
    }

    if (search && search.trim()) {
      params.push(`%${search.trim()}%`)
      conditions.push(`(sc.sub_category_name ILIKE $${params.length} OR sc.sub_catg_code ILIKE $${params.length})`)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(`
      SELECT 
        sc.*,
        c.catg_name,
        c.catg_code
      FROM sub_category_master sc
      LEFT JOIN category_master c ON sc.category_id = c.id
      ${whereClause}
      ORDER BY sc.sub_catg_code
    `, params)

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
    const { sub_category_name, discount, category_id } = req.body

    if (!sub_category_name || !sub_category_name.trim()) {
      return res.status(400).json({ success: false, message: 'Sub-category name is required' })
    }

    const sub_catg_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO sub_category_master (sub_catg_code, sub_category_name, discount, category_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [sub_catg_code, sub_category_name.trim(), discount ? Number(discount) : 0, category_id || null])

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

const importSubCategories = async (req, res) => {
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
      const sub_category_name = (
        row['Sub Category Description'] ||
        row['Sub-Category Description'] ||
        row['Sub Category Name'] ||
        row['Sub-Category Name'] ||
        row['sub_category_name'] ||
        row['sub_catg_name'] ||
        ''
      ).trim()
      const discount = parseFloat(row['Discount %'] || row['discount'] || 0)
      const catg_name = (row['Category Name'] || row['Category Description'] || row['catg_name'] || row['category_name'] || '').trim()

      if (!sub_category_name) {
        errors.push({ row: rowNum, message: 'Sub Category Description is required' })
        continue
      }
      if (isNaN(discount) || discount < 0 || discount > 100) {
        errors.push({ row: rowNum, message: 'Discount % must be between 0 and 100' })
        continue
      }

      // Resolve Category Name (optional)
      let category_id = null
      if (catg_name) {
        const catRes = await query(
          'SELECT id FROM category_master WHERE LOWER(COALESCE(catg_name, category_name)) = LOWER($1) AND is_active = true',
          [catg_name]
        )
        if (catRes.rows.length === 0) {
          errors.push({
            row: rowNum,
            message: `Category "${catg_name}" not found. Create it first in Category Master.`
          })
          continue
        }
        category_id = catRes.rows[0].id
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM sub_category_master WHERE LOWER(sub_category_name) = LOWER($1)',
        [sub_category_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const sub_catg_code = await generateCode()
      await query(`
        INSERT INTO sub_category_master (sub_catg_code, sub_category_name, discount, category_id)
        VALUES ($1, $2, $3, $4)
      `, [sub_catg_code, sub_category_name, discount, category_id])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  importSubCategories
}

