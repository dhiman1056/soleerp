'use strict';

const { validationResult } = require('express-validator');
const { query }            = require('../config/db');
const { createError }      = require('../middleware/errorHandler');

const VALID_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED'];

const validate = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err  = new Error('Validation failed');
    err.type   = 'validation';
    err.errors = errors.array();
    throw err;
  }
};

// ─── GET /api/products ───────────────────────────────────────────────────────
// Query params: product_type, page, limit, search
const listProducts = async (req, res, next) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(100, parseInt(req.query.limit) || 20);
    const offset    = (page - 1) * limit;
    const search    = req.query.search       || '';
    const typeFilter = req.query.product_type || '';

    if (typeFilter && !VALID_TYPES.includes(typeFilter.toUpperCase())) {
      throw createError(400, `Invalid product_type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const conditions = [];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(sku_code ILIKE $${params.length} OR description ILIKE $${params.length})`);
    }

    if (typeFilter) {
      params.push(typeFilter.toUpperCase());
      conditions.push(`product_type = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM product_master ${where}`,
      params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const dataRes = await query(
      `SELECT id, sku_code, description, product_type, uom, created_at, updated_at
       FROM   product_master
       ${where}
       ORDER  BY product_type, sku_code
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

// ─── GET /api/products/:sku ──────────────────────────────────────────────────
const getProduct = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const result  = await query(
      `SELECT id, sku_code, description, product_type, uom, created_at, updated_at
       FROM   product_master
       WHERE  sku_code = $1`,
      [sku]
    );

    if (!result.rows.length) throw createError(404, `Product '${sku}' not found.`);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/products ──────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  try {
    validate(req);
    const { sku_code, description, product_type, uom } = req.body;

    const result = await query(
      `INSERT INTO product_master (sku_code, description, product_type, uom)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        sku_code.trim().toUpperCase(),
        description.trim(),
        product_type.toUpperCase(),
        uom.trim().toUpperCase(),
      ]
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── PUT /api/products/:sku ──────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  try {
    validate(req);
    const { sku } = req.params;
    const { description, product_type, uom } = req.body;

    const sets   = [];
    const params = [];

    if (description  !== undefined) { params.push(description.trim()); sets.push(`description = $${params.length}`); }
    if (product_type !== undefined) {
      if (!VALID_TYPES.includes(product_type.toUpperCase())) {
        throw createError(400, `Invalid product_type. Must be one of: ${VALID_TYPES.join(', ')}`);
      }
      params.push(product_type.toUpperCase()); sets.push(`product_type = $${params.length}`);
    }
    if (uom          !== undefined) { params.push(uom.trim().toUpperCase()); sets.push(`uom = $${params.length}`); }

    if (!sets.length) throw createError(400, 'No updatable fields provided.');

    params.push(sku);
    const result = await query(
      `UPDATE product_master
       SET    ${sets.join(', ')}
       WHERE  sku_code = $${params.length}
       RETURNING *`,
      params
    );

    if (!result.rows.length) throw createError(404, `Product '${sku}' not found.`);

    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/products/:sku ───────────────────────────────────────────────
// NOTE: product_master has no is_active column by default; we guard via BOM dependency check.
// For safety we simply check if a BOM references this SKU before deletion.
const deleteProduct = async (req, res, next) => {
  try {
    const { sku } = req.params;

    // Check if any active BOM uses this SKU as output
    const bomCheck = await query(
      `SELECT COUNT(*) FROM bom_header WHERE output_sku = $1 AND is_active = TRUE`,
      [sku]
    );
    if (parseInt(bomCheck.rows[0].count) > 0) {
      throw createError(
        409,
        `Cannot delete product '${sku}': it is referenced by one or more active BOMs.`
      );
    }

    const result = await query(
      `DELETE FROM product_master WHERE sku_code = $1 RETURNING sku_code`,
      [sku]
    );

    if (!result.rows.length) throw createError(404, `Product '${sku}' not found.`);

    return res.status(200).json({
      success: true,
      message: `Product '${sku}' deleted successfully.`,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
