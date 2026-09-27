const { query } = require('../config/db')

// ─── Auto-generate sg_code and dept_code ──────────────────────────────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CASE 
        WHEN sg_code ~ '^[0-9]+$' THEN CAST(sg_code AS INTEGER)
        WHEN dept_code ~ '^[A-Z]+-[0-9]+$' THEN CAST(SUBSTRING(dept_code FROM '[0-9]+') AS INTEGER)
        ELSE id
      END
    ), 0) + 1 AS next_num
    FROM department_master
  `)
  const nextNum = rows[0]?.next_num || 1
  return {
    sg_code: String(nextNum),
    dept_code: `SG-${String(nextNum).padStart(4, '0')}`
  }
}

const formatRow = (r) => ({
  ...r,
  dept_name: r.dept_name,
  department_name: r.dept_name,
  stock_group: r.dept_name,
  stock_group_name: r.dept_name,
  stock_type: r.stock_type || 'INVENTORY',
  bom_applicable: Boolean(r.bom_applicable),
  sg_code: r.sg_code || (r.dept_code ? r.dept_code.replace(/^[A-Z]+-0*/, '') : String(r.id)),
})

// ─── GET /api/departments (also /api/stock-groups) ─────────────────────────────
const listDepartments = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM department_master
      WHERE is_active = true
      ORDER BY 
        CASE WHEN sg_code ~ '^[0-9]+$' THEN CAST(sg_code AS INTEGER) ELSE 999999 END ASC,
        dept_name ASC
    `)

    res.json({ success: true, data: rows.map(formatRow) })
  } catch (err) {
    console.error('[departmentController] listDepartments:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/departments/:id ─────────────────────────────────────────────────
const getDepartment = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT *
      FROM department_master
      WHERE id = $1
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Stock group not found' })
    res.json({ success: true, data: formatRow(rows[0]) })
  } catch (err) {
    console.error('[departmentController] getDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/departments ────────────────────────────────────────────────────
const createDepartment = async (req, res) => {
  try {
    const name = (req.body.stock_group || req.body.dept_name || req.body.stock_group_name || '').trim()
    let { sg_code, stock_type, bom_applicable, discount } = req.body

    if (!name) {
      return res.status(400).json({ success: false, message: 'Stock group name is required' })
    }

    const codes = await generateCode()
    const finalSgCode = (sg_code ? String(sg_code).trim() : codes.sg_code)
    const finalDeptCode = req.body.dept_code || `SG-${finalSgCode.padStart(4, '0')}`
    const finalStockType = (stock_type === 'NON-INVENTORY' ? 'NON-INVENTORY' : 'INVENTORY')
    const finalBomApplicable = Boolean(bom_applicable)

    const { rows } = await query(`
      INSERT INTO department_master (dept_code, sg_code, dept_name, stock_type, bom_applicable, discount, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *
    `, [finalDeptCode, finalSgCode, name, finalStockType, finalBomApplicable, discount ? Number(discount) : 0])

    res.status(201).json({ success: true, data: formatRow(rows[0]) })
  } catch (err) {
    console.error('[departmentController] createDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/departments/:id ─────────────────────────────────────────────────
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const name = (req.body.stock_group || req.body.dept_name || req.body.stock_group_name || '').trim()
    const { sg_code, stock_type, bom_applicable, discount, is_active } = req.body

    const { rows } = await query(`
      UPDATE department_master SET
        dept_name      = COALESCE(NULLIF($1, ''), dept_name),
        sg_code        = COALESCE($2, sg_code),
        stock_type     = COALESCE($3, stock_type),
        bom_applicable = COALESCE($4, bom_applicable),
        discount       = COALESCE($5, discount),
        is_active      = COALESCE($6, is_active),
        updated_at     = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      name || null,
      sg_code !== undefined ? String(sg_code).trim() : null,
      stock_type !== undefined ? stock_type : null,
      bom_applicable !== undefined ? Boolean(bom_applicable) : null,
      discount !== undefined && discount !== '' ? Number(discount) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Stock group not found' })

    res.json({ success: true, data: formatRow(rows[0]) })
  } catch (err) {
    console.error('[departmentController] updateDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/departments/:id (soft delete) ────────────────────────────────
const deleteDepartment = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE department_master
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Stock group not found' })
    res.json({ success: true, message: 'Stock group deactivated' })
  } catch (err) {
    console.error('[departmentController] deleteDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const importDepartments = async (req, res) => {
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
      const name = (row['STOCK GROUP'] || row['Stock Group'] || row['stock_group'] || row['Department Name'] || row['dept_name'] || '').trim()
      const sg_code_in = (row['SG CODE'] || row['sg_code'] || row['Sg Code'] || '').toString().trim()
      const rawStockType = (row['STOCK TYPES'] || row['Stock Types'] || row['Stock Type'] || row['stock_type'] || '').toString().trim().toUpperCase()
      const stock_type = (rawStockType === 'NON-INVENTORY' || rawStockType.includes('NON') ? 'NON-INVENTORY' : 'INVENTORY')
      
      const rawBom = (row['TYPES OR BOM APLICABLE'] || row['TYPES OF BOM APPLICABLE'] || row['Types or BOM Applicable'] || row['bom_applicable'] || row['BOM Applicable'] || '').toString().trim().toUpperCase()
      const bom_applicable = Boolean(rawBom && (rawBom.includes('BOM') || rawBom === 'TRUE' || rawBom === 'YES' || rawBom === '1'))
      const discount = parseFloat(row['Discount %'] || row['discount'] || 0) || 0

      if (!name) {
        errors.push({ row: rowNum, message: 'Stock Group name is required' })
        continue
      }
      if (isNaN(discount) || discount < 0 || discount > 100) {
        errors.push({ row: rowNum, message: 'Discount % must be between 0 and 100' })
        continue
      }

      // Check if duplicate / existing
      const dup = await query(
        'SELECT id FROM department_master WHERE UPPER(dept_name) = UPPER($1)',
        [name]
      )
      if (dup.rows.length > 0) {
        await query(`
          UPDATE department_master SET
            sg_code = COALESCE(NULLIF($1, ''), sg_code),
            stock_type = $2,
            bom_applicable = $3,
            discount = $4,
            is_active = true,
            updated_at = NOW()
          WHERE id = $5
        `, [sg_code_in, stock_type, bom_applicable, discount, dup.rows[0].id])
        imported++
        continue
      }

      const codes = await generateCode()
      const finalSgCode = sg_code_in || codes.sg_code
      const dept_code = `SG-${finalSgCode.padStart(4, '0')}`

      await query(`
        INSERT INTO department_master (dept_code, sg_code, dept_name, stock_type, bom_applicable, discount, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
      `, [dept_code, finalSgCode, name, stock_type, bom_applicable, discount])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  importDepartments
}
