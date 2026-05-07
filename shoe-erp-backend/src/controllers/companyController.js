const { query } = require('../config/db')

// Auto generate company code: COMP-0001, COMP-0002, ...
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(company_code FROM 6) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM company_master
    WHERE company_code ~ '^COMP-[0-9]+$'
  `)
  return `COMP-${String(rows[0].next_num).padStart(4, '0')}`
}

const listCompanies = async (req, res) => {
  try {
    const { search, is_active } = req.query
    const conditions = []
    const params = []

    if (is_active !== undefined) {
      params.push(is_active === 'true')
      conditions.push(`is_active = $${params.length}`)
    }
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(company_name ILIKE $${params.length} OR company_code ILIKE $${params.length})`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const { rows } = await query(
      `SELECT * FROM company_master ${where} ORDER BY company_code`,
      params
    )
    res.json({ success: true, data: rows })
  } catch (err) {
    console.error('[companyController] listCompanies:', err.message)
    res.status(500).json({ message: err.message })
  }
}

const getCompany = async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT * FROM company_master WHERE id = $1',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Company not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[companyController] getCompany:', err.message)
    res.status(500).json({ message: err.message })
  }
}

const createCompany = async (req, res) => {
  try {
    const {
      company_name, description, licence_no, address,
      state, city, pincode, contact_person, contact_mobile,
      email, customer_care_no, msme_certificate, gstin
    } = req.body

    if (!company_name || !company_name.trim()) {
      return res.status(400).json({ message: 'Company name is required' })
    }

    const company_code = await generateCode()

    const { rows } = await query(`
      INSERT INTO company_master (
        company_code, company_name, description, licence_no,
        address, state, city, pincode, contact_person,
        contact_mobile, email, customer_care_no,
        msme_certificate, gstin
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING *
    `, [
      company_code, company_name.trim(), description || null, licence_no || null,
      address || null, state || null, city || null, pincode || null,
      contact_person || null, contact_mobile || null, email || null,
      customer_care_no || null, msme_certificate || null, gstin || null
    ])

    res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[companyController] createCompany:', err.message)
    res.status(500).json({ message: err.message })
  }
}

const updateCompany = async (req, res) => {
  try {
    const { id } = req.params
    const {
      company_name, description, licence_no, address,
      state, city, pincode, contact_person, contact_mobile,
      email, customer_care_no, msme_certificate,
      gstin, is_active
    } = req.body

    const { rows } = await query(`
      UPDATE company_master SET
        company_name      = COALESCE($1,  company_name),
        description       = COALESCE($2,  description),
        licence_no        = COALESCE($3,  licence_no),
        address           = COALESCE($4,  address),
        state             = COALESCE($5,  state),
        city              = COALESCE($6,  city),
        pincode           = COALESCE($7,  pincode),
        contact_person    = COALESCE($8,  contact_person),
        contact_mobile    = COALESCE($9,  contact_mobile),
        email             = COALESCE($10, email),
        customer_care_no  = COALESCE($11, customer_care_no),
        msme_certificate  = COALESCE($12, msme_certificate),
        gstin             = COALESCE($13, gstin),
        is_active         = COALESCE($14, is_active),
        updated_at        = NOW()
      WHERE id = $15
      RETURNING *
    `, [
      company_name || null, description ?? null, licence_no ?? null, address ?? null,
      state ?? null, city ?? null, pincode ?? null, contact_person ?? null,
      contact_mobile ?? null, email ?? null, customer_care_no ?? null,
      msme_certificate ?? null, gstin ?? null,
      is_active !== undefined ? is_active : null,
      id
    ])

    if (!rows.length) return res.status(404).json({ message: 'Company not found' })
    res.json({ success: true, data: rows[0] })
  } catch (err) {
    console.error('[companyController] updateCompany:', err.message)
    res.status(500).json({ message: err.message })
  }
}

const deleteCompany = async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE company_master SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    )
    if (!rows.length) return res.status(404).json({ message: 'Company not found' })
    res.json({ success: true, message: 'Company deactivated' })
  } catch (err) {
    console.error('[companyController] deleteCompany:', err.message)
    res.status(500).json({ message: err.message })
  }
}

module.exports = {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany
}
