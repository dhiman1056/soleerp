const { pool } = require('./src/config/db');

const run = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wo_size_breakup (
        id SERIAL PRIMARY KEY,
        wo_id INTEGER REFERENCES work_order_header(id) ON DELETE CASCADE,
        size_code VARCHAR(10) NOT NULL,
        planned_qty INTEGER DEFAULT 0,
        received_qty INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS wo_size_receipts (
        id SERIAL PRIMARY KEY,
        receipt_id INTEGER REFERENCES wo_receipt_lines(id) ON DELETE CASCADE,
        wo_id INTEGER REFERENCES work_order_header(id) ON DELETE CASCADE,
        size_code VARCHAR(10) NOT NULL,
        receive_qty INTEGER DEFAULT 0,
        rejection_qty INTEGER DEFAULT 0,
        rejection_reason VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log("SQL executed successfully.");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
