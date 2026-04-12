'use strict';

const { query, pool } = require('../config/db');

const listBoms = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT 
        h.id, h.bom_code, h.output_sku, h.output_qty, 
        h.output_uom, h.bom_type, h.is_active,
        p.description as product_name,
        COUNT(l.id) as component_count,
        COALESCE(SUM(l.consume_qty * l.rate_at_bom), 0) as total_cost
      FROM bom_header h
      JOIN product_master p ON h.output_sku = p.sku_code
      LEFT JOIN bom_lines l ON l.bom_id = h.id
      WHERE h.is_active = true
      GROUP BY h.id, h.bom_code, h.output_sku, h.output_qty,
        h.output_uom, h.bom_type, h.is_active, p.description
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getBom = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT h.*, p.description as product_name,
        json_agg(json_build_object(
          'id', l.id,
          'input_sku', l.input_sku,
          'description', pm2.description,
          'consume_qty', l.consume_qty,
          'uom', l.uom,
          'rate_at_bom', l.rate_at_bom,
          'value', l.consume_qty * l.rate_at_bom
        )) as components
      FROM bom_header h
      JOIN product_master p ON h.output_sku = p.sku_code
      LEFT JOIN bom_lines l ON l.bom_id = h.id
      LEFT JOIN product_master pm2 ON l.input_sku = pm2.sku_code
      WHERE h.id = $1
      GROUP BY h.id, p.description
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'BOM not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createBom = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { bom_code, output_sku, output_qty, output_uom, bom_type, remarks, lines } = req.body;

    const { rows: headerRows } = await client.query(`
      INSERT INTO bom_header 
      (bom_code, output_sku, output_qty, output_uom, bom_type, remarks)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [bom_code || `BOM-${Date.now()}`, output_sku, output_qty, output_uom, bom_type, remarks]);

    const bomId = headerRows[0].id;

    if (lines && lines.length > 0) {
      for (const l of lines) {
        await client.query(`
          INSERT INTO bom_lines (bom_id, input_sku, consume_qty, uom, rate_at_bom)
          VALUES ($1,$2,$3,$4,$5)
        `, [bomId, l.input_sku, l.consume_qty, l.uom, l.rate_at_bom]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: headerRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

const updateBom = async (req, res) => res.status(501).json({ message: 'Not Implemented' });
const deleteBom = async (req, res) => res.status(501).json({ message: 'Not Implemented' });

module.exports = { listBoms, getBom, createBom, updateBom, deleteBom };
