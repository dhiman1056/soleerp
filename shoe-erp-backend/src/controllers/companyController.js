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

    if (contact_mobile) {
      const mobile = contact_mobile.trim()
      if (mobile && !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'Contact Mobile must be a valid 10-digit number' })
      }
    }

    if (email) {
      const emailStr = email.trim()
      if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        return res.status(400).json({ message: 'Please enter a valid Email address' })
      }
    }

    if (pincode) {
      const pin = pincode.trim()
      if (pin && !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: 'Pincode must be a valid 6-digit number' })
      }
    }

    if (gstin) {
      const gst = gstin.trim()
      if (gst && gst.length !== 15) {
        return res.status(400).json({ message: 'GSTIN must be exactly 15 characters long' })
      }
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

    if (company_name !== undefined && (!company_name || !company_name.trim())) {
      return res.status(400).json({ message: 'Company name is required' })
    }

    if (contact_mobile !== undefined && contact_mobile !== null) {
      const mobile = contact_mobile.trim()
      if (mobile && !/^\d{10}$/.test(mobile)) {
        return res.status(400).json({ message: 'Contact Mobile must be a valid 10-digit number' })
      }
    }

    if (email !== undefined && email !== null) {
      const emailStr = email.trim()
      if (emailStr && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        return res.status(400).json({ message: 'Please enter a valid Email address' })
      }
    }

    if (pincode !== undefined && pincode !== null) {
      const pin = pincode.trim()
      if (pin && !/^\d{6}$/.test(pin)) {
        return res.status(400).json({ message: 'Pincode must be a valid 6-digit number' })
      }
    }

    if (gstin !== undefined && gstin !== null) {
      const gst = gstin.trim()
      if (gst && gst.length !== 15) {
        return res.status(400).json({ message: 'GSTIN must be exactly 15 characters long' })
      }
    }

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

const importCompanies = async (req, res) => {
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
      const company_name    = (row['Company Name']      || '').trim()
      const description     = (row['Description']       || '').trim() || null
      const licence_no      = (row['Licence No']        || '').trim() || null
      const address         = (row['Address']           || '').trim() || null
      const state           = (row['State']             || '').trim() || null
      const city            = (row['City']              || '').trim() || null
      const pincode         = (row['Pincode']           || '').trim() || null
      const contact_person  = (row['Contact Person']    || '').trim() || null
      const contact_mobile  = (row['Contact Mobile']    || '').trim() || null
      const email           = (row['Email']             || '').trim() || null
      const customer_care_no = (row['Customer Care No'] || '').trim() || null
      const msme_certificate = (row['MSME Certificate'] || '').trim() || null
      const gstin           = (row['GSTIN']             || '').trim() || null

      if (!company_name) {
        errors.push({ row: rowNum, message: 'Company Name is required' })
        continue
      }

      if (contact_mobile && !/^\d{10}$/.test(contact_mobile)) {
        errors.push({ row: rowNum, message: 'Contact Mobile must be a valid 10-digit number' })
        continue
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: rowNum, message: 'Please enter a valid Email address' })
        continue
      }

      if (pincode && !/^\d{6}$/.test(pincode)) {
        errors.push({ row: rowNum, message: 'Pincode must be a valid 6-digit number' })
        continue
      }

      if (gstin && gstin.length !== 15) {
        errors.push({ row: rowNum, message: 'GSTIN must be exactly 15 characters long' })
        continue
      }

      // Skip duplicate
      const dup = await query(
        'SELECT id FROM company_master WHERE LOWER(company_name) = LOWER($1)',
        [company_name]
      )
      if (dup.rows.length > 0) { skipped++; continue }

      const company_code = await generateCode()
      await query(`
        INSERT INTO company_master (
          company_code, company_name, description, licence_no,
          address, state, city, pincode, contact_person,
          contact_mobile, email, customer_care_no,
          msme_certificate, gstin
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      `, [
        company_code, company_name, description, licence_no,
        address, state, city, pincode, contact_person,
        contact_mobile, email, customer_care_no,
        msme_certificate, gstin
      ])

      imported++
    } catch (err) {
      errors.push({ row: rowNum, message: err.message })
    }
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
  importCompanies
}
