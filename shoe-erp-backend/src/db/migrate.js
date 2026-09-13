const { pool } = require('../config/db')
const fs = require('fs')
const path = require('path')

const bcrypt = require('bcryptjs')

const migrate = async () => {
  let client
  try {
    client = await pool.connect()
    console.log('[DB] Running migrations...')
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations.sql'), 'utf8'
    )
    await client.query(sql)
    console.log('[DB] Migrations complete!')

    // Auto-seed default users if table is empty
    const countRes = await client.query('SELECT COUNT(*) FROM users')
    if (parseInt(countRes.rows[0].count, 10) === 0) {
      console.log('[DB] Seeding default users...')
      const hash = await bcrypt.hash('Admin@123', 10)
      await client.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES 
           ('Admin User', 'admin@shoeerp.com', $1, 'admin'),
           ('Admin User', 'admin@shoecompany.com', $1, 'admin')
         ON CONFLICT (email) DO NOTHING`,
        [hash]
      )
      console.log('[DB] Default admin users seeded: admin@shoeerp.com / Admin@123')
    }
  } catch (err) {
    console.error('[DB] Migration error:', err.message)
  } finally {
    if (client) client.release()
  }
}

module.exports = migrate
