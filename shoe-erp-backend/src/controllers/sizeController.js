'use strict';

const { query } = require('../config/db');

const VALID_CHARTS = ['INFANT', 'KIDS', 'LADIES', 'MEN'];

// ─── Auto-generate size_master_code: SIZE-0001, SIZE-0002 … ─────────────────
const generateCode = async () => {
  const { rows } = await query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(size_master_code FROM 6) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM size_master
    WHERE size_master_code ~ '^SIZE-[0-9]+$'
  `);
  return `SIZE-${String(rows[0].next_num).padStart(4, '0')}`;
};

// ─── GET /api/sizes ───────────────────────────────────────────────────────────
const getSizes = async (req, res) => {
  try {
    const { is_active, size_chart, search } = req.query;
    const conditions = [];
    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }
    if (size_chart) {
      params.push(size_chart.toUpperCase());
      conditions.push(`size_chart = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(size_label ILIKE $${params.length} OR size_master_code ILIKE $${params.length} OR size_code ILIKE $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const { rows } = await query(
      `SELECT * FROM size_master ${where} ORDER BY size_chart NULLS LAST, sort_order ASC, size_code ASC`,
      params
    );
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error('[sizeController] getSizes:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/sizes/:id ───────────────────────────────────────────────────────
const getSize = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM size_master WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Size not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[sizeController] getSize:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/sizes ──────────────────────────────────────────────────────────
const createSize = async (req, res) => {
  try {
    const { size_label, description, size_chart, uk_size, euro_size, sort_order = 0 } = req.body;

    if (!size_label || !size_label.trim()) {
      return res.status(400).json({ success: false, message: 'Size label is required' });
    }
    if (!size_chart || !VALID_CHARTS.includes(size_chart.toUpperCase())) {
      return res.status(400).json({ success: false, message: `Size chart must be one of: ${VALID_CHARTS.join(', ')}` });
    }

    const size_master_code = await generateCode();

    // Build a size_code from chart + uk_size for backward compat (e.g. KIDS-8)
    const size_code = uk_size
      ? `${size_chart.toUpperCase()}-${uk_size}`
      : size_master_code;

    const { rows } = await query(`
      INSERT INTO size_master
        (size_master_code, size_code, size_label, description, size_chart, uk_size, euro_size, sort_order)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      size_master_code,
      size_code,
      size_label.trim(),
      description || null,
      size_chart.toUpperCase(),
      uk_size   || null,
      euro_size || null,
      Number(sort_order) || 0
    ]);

    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[sizeController] createSize:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/sizes/:id ───────────────────────────────────────────────────────
const updateSize = async (req, res) => {
  try {
    const { id } = req.params;
    const { size_label, description, size_chart, uk_size, euro_size, sort_order, is_active } = req.body;

    const sets = [];
    const params = [];

    if (size_label  !== undefined) { params.push(size_label.trim()); sets.push(`size_label = $${params.length}`); }
    if (description !== undefined) { params.push(description ?? null); sets.push(`description = $${params.length}`); }
    if (size_chart  !== undefined) { params.push(size_chart?.toUpperCase() || null); sets.push(`size_chart = $${params.length}`); }
    if (uk_size     !== undefined) { params.push(uk_size ?? null); sets.push(`uk_size = $${params.length}`); }
    if (euro_size   !== undefined) { params.push(euro_size ?? null); sets.push(`euro_size = $${params.length}`); }
    if (sort_order  !== undefined) { params.push(Number(sort_order) || 0); sets.push(`sort_order = $${params.length}`); }
    if (is_active   !== undefined) { params.push(is_active); sets.push(`is_active = $${params.length}`); }

    if (!sets.length) return res.status(200).json({ success: true, message: 'Nothing to update' });

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const { rows } = await query(
      `UPDATE size_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Size not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[sizeController] updateSize:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── DELETE /api/sizes/:id (soft delete) ─────────────────────────────────────
const deleteSize = async (req, res) => {
  try {
    const { rows } = await query(
      'UPDATE size_master SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Size not found' });
    return res.status(200).json({ success: true, message: 'Size deactivated' });
  } catch (err) {
    console.error('[sizeController] deleteSize:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getSizes, getSize, createSize, updateSize, deleteSize };
