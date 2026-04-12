'use strict';

const { validationResult } = require('express-validator');
const { query }            = require('../config/db');
const { createError }      = require('../middleware/errorHandler');

// ─── helpers ────────────────────────────────────────────────────────────────

const validate = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err    = new Error('Validation failed');
    err.type     = 'validation';
    err.errors   = errors.array();
    throw err;
  }
};

// ─── GET /api/raw-materials ──────────────────────────────────────────────────
// Query params: page, limit, search, is_active
const listRawMaterials = async (req, res, next) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(100, parseInt(req.query.limit) || 20);
    const offset    = (page - 1) * limit;
    const search    = req.query.search    || '';
    const is_active = req.query.is_active;          // 'true' | 'false' | undefined

    const conditions = [];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(sku_code ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      conditions.push(`is_active = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // total count
    const countRes = await query(
      `SELECT COUNT(*) FROM raw_material_master ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    // paginated data
    params.push(limit, offset);
    const dataRes = await query(
      `SELECT id, sku_code, description, uom, rate, is_active, created_at, updated_at
       FROM   raw_material_master
       ${where}
       ORDER  BY sku_code
       LIMIT  $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      success: true,
      data:    dataRes.rows,
      meta:    { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/raw-materials/:sku ─────────────────────────────────────────────
const getRawMaterial = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const result  = await query(
      `SELECT id, sku_code, description, uom, rate, is_active, created_at, updated_at
       FROM   raw_material_master
       WHERE  sku_code = $1`,
      [sku]
    );

    if (!result.rows.length) throw createError(404, `Raw material '${sku}' not found.`);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/raw-materials ─────────────────────────────────────────────────
const createRawMaterial = async (req, res, next) => {
  try {
    validate(req);
    const { sku_code, description, uom, rate = 0 } = req.body;

    const result = await query(
      `INSERT INTO raw_material_master (sku_code, description, uom, rate)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [sku_code.trim().toUpperCase(), description.trim(), uom.trim().toUpperCase(), rate]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/raw-materials/:sku ─────────────────────────────────────────────
const updateRawMaterial = async (req, res, next) => {
  try {
    validate(req);
    const { sku } = req.params;
    const { description, uom, rate } = req.body;

    // Build dynamic SET clause for only provided fields
    const sets   = [];
    const params = [];

    if (description !== undefined) { params.push(description.trim()); sets.push(`description = $${params.length}`); }
    if (uom         !== undefined) { params.push(uom.trim().toUpperCase()); sets.push(`uom = $${params.length}`); }
    if (rate        !== undefined) { params.push(rate); sets.push(`rate = $${params.length}`); }

    if (!sets.length) throw createError(400, 'No updatable fields provided.');

    params.push(sku);
    const result = await query(
      `UPDATE raw_material_master
       SET    ${sets.join(', ')}
       WHERE  sku_code = $${params.length}
       RETURNING *`,
      params
    );

    if (!result.rows.length) throw createError(404, `Raw material '${sku}' not found.`);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/raw-materials/:sku ──────────────────────────────────────────
// Soft delete — sets is_active = false
const deleteRawMaterial = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const result  = await query(
      `UPDATE raw_material_master
       SET    is_active = FALSE
       WHERE  sku_code  = $1 AND is_active = TRUE
       RETURNING sku_code, is_active`,
      [sku]
    );

    if (!result.rows.length) {
      throw createError(404, `Raw material '${sku}' not found or already inactive.`);
    }

    return res.status(200).json({
      success: true,
      message: `Raw material '${sku}' has been deactivated.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRawMaterials,
  getRawMaterial,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
};
