'use strict';

const { query } = require('../config/db');
const { createError } = require('../middleware/errorHandler');

const getSizes = async (req, res, next) => {
  try {
    const is_active = req.query.is_active;
    let sql = 'SELECT * FROM size_master';
    const params = [];
    if (is_active !== undefined) {
      params.push(is_active === 'true');
      sql += ' WHERE is_active = $1';
    }
    sql += ' ORDER BY sort_order ASC, id ASC';
    const result = await query(sql, params);
    
    return res.status(200).json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

const createSize = async (req, res, next) => {
  try {
    const { size_code, size_label, sort_order = 0 } = req.body;
    const result = await query(
      `INSERT INTO size_master (size_code, size_label, sort_order) 
       VALUES ($1, $2, $3) RETURNING *`,
      [size_code.toUpperCase(), size_label, sort_order]
    );
    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const updateSize = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { size_label, sort_order, is_active } = req.body;
    
    const sets = [];
    const params = [];
    if (size_label !== undefined) { params.push(size_label); sets.push(`size_label = $${params.length}`); }
    if (sort_order !== undefined) { params.push(sort_order); sets.push(`sort_order = $${params.length}`); }
    if (is_active !== undefined) { params.push(is_active); sets.push(`is_active = $${params.length}`); }
    
    if (sets.length === 0) return res.status(200).json({ success: true });
    
    params.push(id);
    const result = await query(
      `UPDATE size_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) throw createError(404, 'Size not found');
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

const deleteSize = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query('UPDATE size_master SET is_active = FALSE WHERE id = $1 RETURNING *', [id]);
    if (!result.rows.length) throw createError(404, 'Size not found');
    return res.status(200).json({ success: true, message: 'Size deactivated' });
  } catch (err) { next(err); }
};

module.exports = { getSizes, createSize, updateSize, deleteSize };
