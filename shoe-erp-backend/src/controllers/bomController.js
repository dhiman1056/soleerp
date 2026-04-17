'use strict';

const { query, pool } = require('../config/db');

// ─── GET /api/bom ────────────────────────────────────────────────────────────
const listBoms = async (req, res) => {
  try {
    const { search, bom_type, is_active = 'true' } = req.query;

    const conditions = [];
    const params = [];

    if (is_active !== 'all') {
      params.push(is_active === 'false' ? false : true);
      conditions.push(`h.is_active = $${params.length}`);
    }

    if (bom_type) {
      params.push(bom_type);
      conditions.push(`h.bom_type = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(h.bom_code ILIKE $${params.length} OR p.description ILIKE $${params.length})`);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(`
      SELECT
        h.id, h.bom_code, h.output_sku, h.output_qty,
        h.output_uom, h.bom_type, h.is_active, h.remarks,
        p.description AS product_name,
        COUNT(l.id)::int AS component_count,
        COALESCE(SUM(l.consume_qty * l.rate_at_bom), 0) AS total_cost
      FROM bom_header h
      JOIN product_master p ON h.output_sku = p.sku_code
      LEFT JOIN bom_lines l ON l.bom_id = h.id
      ${whereClause}
      GROUP BY h.id, h.bom_code, h.output_sku, h.output_qty,
        h.output_uom, h.bom_type, h.is_active, h.remarks, p.description
      ORDER BY h.bom_code
    `, params);

    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/bom/:id ────────────────────────────────────────────────────────
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
        ) ORDER BY l.id) as components
      FROM bom_header h
      JOIN product_master p ON h.output_sku = p.sku_code
      LEFT JOIN bom_lines l ON l.bom_id = h.id
      LEFT JOIN product_master pm2 ON l.input_sku = pm2.sku_code
      WHERE h.id = $1
      GROUP BY h.id, p.description
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: 'BOM not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/bom ───────────────────────────────────────────────────────────
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
    `, [bom_code || `BOM-${Date.now()}`, output_sku, output_qty || 1, output_uom, bom_type, remarks || null]);

    const bomId = headerRows[0].id;

    if (lines && lines.length > 0) {
      for (const l of lines) {
        await client.query(`
          INSERT INTO bom_lines (bom_id, input_sku, consume_qty, uom, rate_at_bom)
          VALUES ($1,$2,$3,$4,$5)
        `, [bomId, l.input_sku, l.consume_qty, l.uom, l.rate_at_bom || 0]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: headerRows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── PUT /api/bom/:id ────────────────────────────────────────────────────────
const updateBom = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { output_sku, output_qty, output_uom, bom_type, remarks, lines } = req.body;

    // Build dynamic SET clause — only update provided fields
    const sets   = [];
    const params = [];

    if (output_sku  !== undefined) { params.push(output_sku);  sets.push(`output_sku  = $${params.length}`); }
    if (output_qty  !== undefined) { params.push(output_qty);  sets.push(`output_qty  = $${params.length}`); }
    if (output_uom  !== undefined) { params.push(output_uom);  sets.push(`output_uom  = $${params.length}`); }
    if (bom_type    !== undefined) { params.push(bom_type);    sets.push(`bom_type    = $${params.length}`); }
    if (remarks     !== undefined) { params.push(remarks);     sets.push(`remarks     = $${params.length}`); }

    if (sets.length === 0 && !lines) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No updatable fields provided.' });
    }

    let headerRow = null;

    if (sets.length > 0) {
      params.push(id);
      const headerResult = await client.query(`
        UPDATE bom_header
        SET    ${sets.join(', ')}
        WHERE  id = $${params.length}
        RETURNING *
      `, params);

      if (headerResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'BOM not found' });
      }
      headerRow = headerResult.rows[0];
    } else {
      // Only lines are being updated — fetch header for the response
      const { rows } = await client.query('SELECT * FROM bom_header WHERE id = $1', [id]);
      if (rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'BOM not found' });
      }
      headerRow = rows[0];
    }

    // Replace lines if provided
    if (lines !== undefined) {
      await client.query('DELETE FROM bom_lines WHERE bom_id = $1', [id]);

      if (Array.isArray(lines) && lines.length > 0) {
        for (const line of lines) {
          await client.query(`
            INSERT INTO bom_lines (bom_id, input_sku, consume_qty, uom, rate_at_bom)
            VALUES ($1, $2, $3, $4, $5)
          `, [id, line.input_sku, line.consume_qty, line.uom, line.rate_at_bom ?? 0]);
        }
      }
    }

    await client.query('COMMIT');

    // Return updated header + fresh lines (with descriptions)
    const { rows: updatedLines } = await pool.query(`
      SELECT bl.id, bl.input_sku, bl.consume_qty, bl.uom, bl.rate_at_bom,
             (bl.consume_qty * bl.rate_at_bom) as value,
             pm.description
      FROM   bom_lines bl
      JOIN   product_master pm ON bl.input_sku = pm.sku_code
      WHERE  bl.bom_id = $1
      ORDER  BY bl.id
    `, [id]);

    return res.json({
      success: true,
      data: { ...headerRow, components: updatedLines },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ success: false, message: err.message });
  } finally {
    client.release();
  }
};

// ─── DELETE /api/bom/:id ─────────────────────────────────────────────────────
// Soft-delete: sets is_active = false
const deleteBom = async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await query(
      'UPDATE bom_header SET is_active = false WHERE id = $1 AND is_active = true RETURNING id, bom_code',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'BOM not found or already inactive' });
    }

    return res.json({ success: true, message: `BOM '${rows[0].bom_code}' deactivated.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listBoms, getBom, createBom, updateBom, deleteBom };
