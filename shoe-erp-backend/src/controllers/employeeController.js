const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(emp_code FROM 5) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM employee_master
    WHERE emp_code ~ '^EMP-[0-9]+$'
  `)
  return `EMP-${String(rows[0].next_num).padStart(4, '0')}`
}

// ─── GET /api/employees ──────────────────────────────────────────────────────
const listEmployees = async (req, res) => {
  try {
    const { search, team_id, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`e.is_active = $${params.length}`)
    }
    if (team_id) {
      params.push(team_id)
      conditions.push(`e.team_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(e.emp_name ILIKE $${params.length} OR e.emp_code ILIKE $${params.length} OR e.designation ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`
      SELECT 
        e.*,
        t.team_name,
        t.team_code,
        d.div_name
      FROM employee_master e
      LEFT JOIN team_master t ON e.team_id = t.id
      LEFT JOIN division_master d ON t.division_id = d.id
      ${where}
      ORDER BY e.emp_code NULLS LAST, e.emp_name
    `, params)

    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[employeeController] listEmployees:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/employees/:id ──────────────────────────────────────────────────
const getEmployee = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        e.*,
        t.team_name,
        t.team_code,
        d.div_name
      FROM employee_master e
      LEFT JOIN team_master t ON e.team_id = t.id
      LEFT JOIN division_master d ON t.division_id = d.id
      WHERE e.id = $1
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[employeeController] getEmployee:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/employees ─────────────────────────────────────────────────────
const createEmployee = async (req, res) => {
  try {
    const { emp_name, team_id, designation, mobile, email } = req.body

    if (!emp_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Employee name is required' })
    }
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile must be 10 digits' })
    }

    const emp_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO employee_master (emp_code, emp_name, team_id, designation, mobile, email)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, [
      emp_code,
      emp_name.trim(),
      team_id ? Number(team_id) : null,
      designation ? designation.trim() : null,
      mobile ? mobile.trim() : null,
      email ? email.trim().toLowerCase() : null
    ])

    // Query full joined row to return back to React Query
    const { rows: full } = await query(`
      SELECT 
        e.*,
        t.team_name,
        t.team_code,
        d.div_name
      FROM employee_master e
      LEFT JOIN team_master t ON e.team_id = t.id
      LEFT JOIN division_master d ON t.division_id = d.id
      WHERE e.id = $1
    `, [rows[0].id])

    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[employeeController] createEmployee:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/employees/:id ──────────────────────────────────────────────────
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params
    const { emp_name, team_id, designation, mobile, email, is_active } = req.body

    if (emp_name !== undefined && !emp_name?.trim()) {
      return res.status(400).json({ success: false, message: 'Employee name is required' })
    }
    if (mobile && !/^[0-9]{10}$/.test(mobile)) {
      return res.status(400).json({ success: false, message: 'Mobile must be 10 digits' })
    }

    const { rows } = await query(`
      UPDATE employee_master SET
        emp_name    = COALESCE($1, emp_name),
        team_id     = COALESCE($2, team_id),
        designation = COALESCE($3, designation),
        mobile      = COALESCE($4, mobile),
        email       = COALESCE($5, email),
        is_active   = COALESCE($6, is_active),
        updated_at  = NOW()
      WHERE id = $7 RETURNING *
    `, [
      emp_name ? emp_name.trim() : null,
      team_id ? Number(team_id) : null,
      designation !== undefined ? (designation ? designation.trim() : null) : null,
      mobile !== undefined ? (mobile ? mobile.trim() : null) : null,
      email !== undefined ? (email ? email.trim().toLowerCase() : null) : null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' })

    const { rows: full } = await query(`
      SELECT 
        e.*,
        t.team_name,
        t.team_code,
        d.div_name
      FROM employee_master e
      LEFT JOIN team_master t ON e.team_id = t.id
      LEFT JOIN division_master d ON t.division_id = d.id
      WHERE e.id = $1
    `, [rows[0].id])

    res.json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[employeeController] updateEmployee:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/employees/:id ────────────────────────────────────────────────
const deleteEmployee = async (req, res) => {
  try {
    const { rows } = await query(`
      UPDATE employee_master 
      SET is_active = false, updated_at = NOW() 
      WHERE id = $1 RETURNING id
    `, [req.params.id])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Employee not found' })
    res.json({ success: true, message: 'Employee deactivated' })
  } catch (err) {
    console.error('[employeeController] deleteEmployee:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

const importEmployees = async (req, res) => {
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
      const emp_name    = (row['Employee Name']    || '').trim()
      const team_name   = (row['Team Name']        || '').trim()
      const designation = (row['Designation']      || '').trim()
      const mobile      = (row['Contact Mobile']   || '').trim()
      const email       = (row['Email Address']    || '').trim()

      if (!emp_name) {
        errors.push({ row: rowNum, message: 'Employee Name is required' })
        continue
      }
      if (mobile && !/^[0-9]{10}$/.test(mobile)) {
        errors.push({ row: rowNum, message: 'Contact Mobile must be 10 digits' })
        continue
      }
      if (email && !email.includes('@')) {
        errors.push({ row: rowNum, message: 'Invalid email format' })
        continue
      }

      // Resolve team name → team_id (optional)
      let team_id = null
      if (team_name) {
        const teamRes = await query(
          'SELECT id FROM team_master WHERE LOWER(team_name) = LOWER($1) AND is_active = true',
          [team_name]
        )
        if (teamRes.rows.length === 0) {
          errors.push({ row: rowNum,
            message: `Team "${team_name}" not found. Create it first in Team Master.` })
          continue
        }
        team_id = teamRes.rows[0].id
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM employee_master WHERE LOWER(emp_name) = LOWER($1)',
        [emp_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const emp_code = await generateCode()
      await query(`
        INSERT INTO employee_master
          (emp_code, emp_name, team_id, designation, mobile, email)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        emp_code, emp_name, team_id,
        designation || null, mobile || null, email || null
      ])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  importEmployees
}
