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
    const { search, location_id, is_active } = req.query
    const conditions = []
    const params = []

    // Default: show active only unless caller explicitly passes is_active=false
    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`d.is_active = $${params.length}`)
    }

    if (location_id) {
      params.push(location_id)
      conditions.push(`d.location_id = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(d.dept_name ILIKE $${params.length} OR d.dept_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(`
      SELECT
        d.*,
        l.location_name,
        l.location_code
      FROM department_master d
      LEFT JOIN location_master l ON d.location_id = l.id
      ${where}
      ORDER BY d.dept_code
    `, params)

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
      SELECT
        d.*,
        l.location_name,
        l.location_code
      FROM department_master d
      LEFT JOIN location_master l ON d.location_id = l.id
      WHERE d.id = $1
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
    const { dept_name, description, location_id } = req.body

    if (!dept_name || !dept_name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' })
    }
    if (!location_id) {
      return res.status(400).json({ success: false, message: 'Location is required to save department' })
    }

    const dept_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO department_master (dept_code, dept_name, description, location_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [dept_code, dept_name.trim(), description || null, location_id])

    // Re-fetch with join so we return location info
    const { rows: full } = await query(`
      SELECT d.*, l.location_name, l.location_code
      FROM department_master d
      LEFT JOIN location_master l ON d.location_id = l.id
      WHERE d.id = $1
    `, [rows[0].id])

    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[departmentController] createDepartment:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/departments/:id ─────────────────────────────────────────────────
const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params
    const { dept_name, description, location_id, is_active } = req.body

    const { rows } = await query(`
      UPDATE department_master SET
        dept_name   = COALESCE($1, dept_name),
        description = COALESCE($2, description),
        location_id = COALESCE($3, location_id),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5
      RETURNING *
    `, [
      dept_name || null,
      description ?? null,
      location_id || null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Department not found' })

    // Re-fetch with join
    const { rows: full } = await query(`
      SELECT d.*, l.location_name, l.location_code
      FROM department_master d
      LEFT JOIN location_master l ON d.location_id = l.id
      WHERE d.id = $1
    `, [rows[0].id])

    res.json({ success: true, data: full[0] })
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
