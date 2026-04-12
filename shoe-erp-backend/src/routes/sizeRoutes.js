const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const roleMiddleware = require('../middleware/roleMiddleware')

router.use(auth)

router.get('/', async (req, res) => {
  try {
    const { query } = require('../config/db')
    const is_active = req.query.is_active
    let sql = 'SELECT * FROM size_master'
    let params = []
    if (is_active !== undefined) {
      sql += ' WHERE is_active = $1'
      params.push(is_active === 'true')
    }
    sql += ' ORDER BY sort_order'
    const result = await query(sql, params)
    res.json({ success: true, data: result.rows })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

router.post('/', roleMiddleware('admin'), async (req, res) => {
  try {
    const { query } = require('../config/db')
    const { size_code, size_label, sort_order } = req.body
    const result = await query(
      'INSERT INTO size_master (size_code, size_label, sort_order) VALUES ($1,$2,$3) RETURNING *',
      [size_code, size_label, sort_order || 0]
    )
    res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
})

module.exports = router
