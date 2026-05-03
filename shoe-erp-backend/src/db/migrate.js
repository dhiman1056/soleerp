const { pool } = require('../config/db')
const fs = require('fs')
const path = require('path')

const migrate = async () => {
  const client = await pool.connect()
  try {
    console.log('[DB] Running migrations...')
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations.sql'), 'utf8'
    )
    await client.query(sql)
    console.log('[DB] Migrations complete!')
  } catch (err) {
    console.error('[DB] Migration error:', err.message)
  } finally {
    client.release()
  }
}

module.exports = migrate
