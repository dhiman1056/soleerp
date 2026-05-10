const { query } = require('../config/db')

// ─── Auto-generate dept_code: DEPT-0001, DEPT-0002 … ─────────────────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(dept_code FROM 6) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM department_master
    WHERE dept_code ~ '^DEPT-[0-9]+$'
  `)
  return `DEPT-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/departments ─────────────────────────────────────────────────────
const listDepartments = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT * FROM department_master
      WHERE is_active = true
      ORDER BY dept_code
    `)

    res.json({ success: true, data: rows })
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

    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[departmentController] getDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/departments ────────────────────────────────────────────────────
const createDepartment = async (req, res) => {
  try {
    const { dept_name, discount } = req.body

    if (!dept_name || !dept_name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' })
    }

    const dept_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO department_master (dept_code, dept_name, discount)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [dept_code, dept_name.trim(), discount ? Number(discount) : 0])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[departmentController] createDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/departments/:id ─────────────────────────────────────────────────
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const { dept_name, discount, is_active } = req.body

    const { rows } = await query(`
      UPDATE department_master SET
        dept_name   = COALESCE($1, dept_name),
        discount    = COALESCE($2, discount),
        is_active   = COALESCE($3, is_active),
        updated_at  = NOW()
      WHERE id = $4
      RETURNING *
    `, [
      dept_name || null,
      discount !== undefined && discount !== '' ? Number(discount) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found' })

    res.json({ success: true, data: rows[0] })
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

    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found' })
    res.json({ success: true, message: 'Department deactivated' })
  } catch (err) {
    console.error('[departmentController] deleteDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

module.exports = {
  listDepartments,
  getDepartment,
  createDepartment,
  updateDepartment,
  deleteDepartment
}
