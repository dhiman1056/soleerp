const { query } = require('../config/db')

const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(CAST(SUBSTRING(team_code FROM 6) AS INTEGER)), 0) + 1 AS next_num
    FROM team_master WHERE team_code ~ '^TEAM-[0-9]+$'
  `)
  return `TEAM-${String(rows[0].next_num).padStart(4, '0')}`
}

const WITH_JOINS = `
  SELECT
    t.*,
    d.div_name,
    d.div_code,
    l.location_name,
    l.location_code
  FROM team_master t
  LEFT JOIN division_master d ON t.division_id = d.id
  LEFT JOIN location_master  l ON d.location_id = l.id
`

// ─── GET /api/teams ───────────────────────────────────────────────────────────
const listTeams = async (req, res) => {
  try {
    const { search, division_id, is_active } = req.query
    const conditions = [], params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`t.is_active = $${params.length}`)
    }
    if (division_id) {
      params.push(division_id)
      conditions.push(`t.division_id = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(t.team_name ILIKE $${params.length} OR t.team_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
    const { rows } = await query(`${WITH_JOINS} ${where} ORDER BY t.team_code`, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[teamController] listTeams:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── GET /api/teams/:id ───────────────────────────────────────────────────────
const getTeam = async (req, res) => {
  try {
    const { rows } = await query(`${WITH_JOINS} WHERE t.id = $1`, [req.params.id])
    if (!rows.length) return res.status(404).json({ success: false, message: 'Team not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── POST /api/teams ──────────────────────────────────────────────────────────
const createTeam = async (req, res) => {
  try {
    const { team_name, description, division_id } = req.body
    if (!team_name?.trim())
      return res.status(400).json({ success: false, message: 'Team name is required' })
    if (!division_id)
      return res.status(400).json({ success: false, message: 'Division is required to save team' })

    const team_code = await generateCode()
    const { rows } = await query(`
      INSERT INTO team_master (team_code, team_name, description, division_id)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [team_code, team_name.trim(), description || null, division_id])

    const { rows: full } = await query(`${WITH_JOINS} WHERE t.id = $1`, [rows[0].id])
    res.status(201).json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[teamController] createTeam:', err.message)
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Team code already exists' })
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── PUT /api/teams/:id ───────────────────────────────────────────────────────
const updateTeam = async (req, res) => {
  try {
    const { id } = req.params
    const { team_name, description, division_id, is_active } = req.body

    const { rows } = await query(`
      UPDATE team_master SET
        team_name   = COALESCE($1, team_name),
        description = COALESCE($2, description),
        division_id = COALESCE($3, division_id),
        is_active   = COALESCE($4, is_active),
        updated_at  = NOW()
      WHERE id = $5 RETURNING *
    `, [
      team_name ? team_name.trim() : null,
      description ?? null,
      division_id || null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ success: false, message: 'Team not found' })
    const { rows: full } = await query(`${WITH_JOINS} WHERE t.id = $1`, [rows[0].id])
    res.json({ success: true, data: full[0] })
  } catch (err) {
    console.error('[teamController] updateTeam:', err.message)
    res.status(500).json({ success: false, message: err.message })
  }
}

// ─── DELETE /api/teams/:id (soft) ─────────────────────────────────────────────
const deleteTeam = async (req, res) => {
  try {
    const { rows } = await query(
      `UPDATE team_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id`,
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ success: false, message: 'Team not found' })
    res.json({ success: true, message: 'Team deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, message: err.message })
  }
}

const importTeams = async (req, res) => {
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
      const team_name  = (row['Team Name']      || '').trim()
      const div_name   = (row['Division Name']  || '').trim()
      const description = (row['Description']   || '').trim()

      if (!team_name) {
        errors.push({ row: rowNum, message: 'Team Name is required' })
        continue
      }
      if (!div_name) {
        errors.push({ row: rowNum, message: 'Division Name is required' })
        continue
      }

      // Resolve division name → division_id (required)
      const divRes = await query(
        'SELECT id FROM division_master WHERE LOWER(div_name) = LOWER($1) AND is_active = true',
        [div_name]
      )
      if (divRes.rows.length === 0) {
        errors.push({ row: rowNum,
          message: `Division "${div_name}" not found. Create it first in Division Master.` })
        continue
      }
      const division_id = divRes.rows[0].id

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM team_master WHERE LOWER(team_name) = LOWER($1) AND division_id = $2',
        [team_name, division_id]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const team_code = await generateCode()
      await query(`
        INSERT INTO team_master (team_code, team_name, division_id, description)
        VALUES ($1, $2, $3, $4)
      `, [team_code, team_name, division_id, description || null])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = { listTeams, getTeam, createTeam, updateTeam, deleteTeam, importTeams }
