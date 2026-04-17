'use strict';

const { validationResult } = require('express-validator');
const { query, pool }      = require('../config/db');
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

// ── SKU Helpers ────────────────────────────────────────────────────────────────
const getSkuPrefix = (product_type) => {
  if (product_type === 'RAW_MATERIAL')  return 'RM'
  if (product_type === 'SEMI_FINISHED') return 'SF'
  if (product_type === 'FINISHED')      return 'FG'
  return 'SKU'
}

const generateSku = async (client, product_type) => {
  const prefix = getSkuPrefix(product_type)
  const { rows } = await client.query(`
    SELECT COALESCE(MAX(
      CAST(SUBSTRING(sku_code FROM LENGTH($1)+1) AS INTEGER)
    ), 0) + 1 AS next_num
    FROM product_master
    WHERE sku_code LIKE $2
      AND sku_code ~ $3
  `, [prefix, `${prefix}%`, `^${prefix}[0-9]+$`])
  return `${prefix}${String(rows[0].next_num).padStart(6, '0')}`
}

// ── GET /api/products/next-sku?product_type=RAW_MATERIAL ────────────────────
const getNextSku = async (req, res, next) => {
  const client = await pool.connect()
  try {
    const product_type = (req.query.product_type || 'RAW_MATERIAL').toUpperCase()
    if (!VALID_TYPES.includes(product_type)) {
      return res.status(400).json({ success: false, message: `Invalid product_type` })
    }
    const sku_code = await generateSku(client, product_type)
    return res.json({ success: true, data: { sku_code } })
  } catch (err) {
    next(err)
  } finally {
    client.release()
  }
}

// ── GET /api/products ──────────────────────────────────────────────────────────
const listProducts = async (req, res, next) => {
  try {
    const page      = Math.max(1, parseInt(req.query.page)  || 1);
    const limit     = Math.min(200, parseInt(req.query.limit) || 50);
    const offset    = (page - 1) * limit;
    const search    = req.query.search       || '';
    const typeFilter = req.query.product_type || '';
    const category  = req.query.category     || '';

    if (typeFilter && !VALID_TYPES.includes(typeFilter.toUpperCase())) {
      throw createError(400, `Invalid product_type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    const conditions = [];
    const params     = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(sku_code ILIKE $${params.length} OR description ILIKE $${params.length} OR design_no ILIKE $${params.length})`);
    }
    if (typeFilter) {
      params.push(typeFilter.toUpperCase());
      conditions.push(`product_type = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(`SELECT COUNT(*) FROM product_master ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const dataRes = await query(`
      SELECT
        id, sku_code, description, product_type, uom,
        design_no, category, sub_category, size_chart,
        color, hsn_code, gst_rate, basic_cost_price,
        cost_price, mrp, sp, supplier_name, brand_name,
        pack_size, images, is_active,
        rate, created_at, updated_at
      FROM product_master
      ${where}
      ORDER BY product_type, sku_code
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return res.status(200).json({
      success: true,
      data:    dataRes.rows,
      meta:    { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/products/:sku ─────────────────────────────────────────────────────
const getProduct = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const result  = await query(`
      SELECT
        id, sku_code, description, product_type, uom,
        design_no, category, sub_category, size_chart,
        color, hsn_code, gst_rate, basic_cost_price,
        cost_price, mrp, sp, supplier_name, brand_name,
        pack_size, images, is_active,
        rate, created_at, updated_at
      FROM product_master
      WHERE sku_code = $1
    `, [sku]);

    if (!result.rows.length) throw createError(404, `Product '${sku}' not found.`);
    return res.status(200).json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ── POST /api/products ─────────────────────────────────────────────────────────
const createProduct = async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const {
      sku_code,
      description, product_type, uom,
      design_no, category, sub_category, size_chart,
      color, hsn_code, gst_rate, basic_cost_price,
      cost_price, mrp, sp, supplier_name, brand_name,
      pack_size, images, is_active,
    } = req.body

    if (!description?.trim()) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: 'description is required' })
    }
    const ptype = (product_type || '').toUpperCase()
    if (!VALID_TYPES.includes(ptype)) {
      await client.query('ROLLBACK')
      return res.status(400).json({ success: false, message: `product_type must be one of: ${VALID_TYPES.join(', ')}` })
    }

    // Auto-generate SKU if not provided
    const finalSku = sku_code?.trim()
      ? sku_code.trim().toUpperCase()
      : await generateSku(client, ptype)

    // cost_price auto from basic + GST if not explicitly supplied
    const basicCp   = parseFloat(basic_cost_price) || 0
    const gstRate   = parseFloat(gst_rate)         || 0
    const finalCp   = cost_price !== undefined && cost_price !== ''
      ? parseFloat(cost_price)
      : +(basicCp * (1 + gstRate / 100)).toFixed(2)

    const { rows } = await client.query(`
      INSERT INTO product_master (
        sku_code, description, product_type, uom,
        design_no, category, sub_category, size_chart,
        color, hsn_code, gst_rate, basic_cost_price,
        cost_price, rate, mrp, sp,
        supplier_name, brand_name,
        pack_size, images, is_active,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21, NOW(), NOW()
      ) RETURNING *
    `, [
      finalSku, description.trim(), ptype, (uom || 'PCS').trim().toUpperCase(),
      design_no    || null, category     || null, sub_category || null,
      size_chart   || null, color        || null, hsn_code     || null,
      gstRate, basicCp, finalCp, finalCp,   // rate mirrors cost_price for stock valuation
      parseFloat(mrp) || 0, parseFloat(sp) || 0,
      supplier_name || null, brand_name  || null,
      parseInt(pack_size) || 1,
      JSON.stringify(Array.isArray(images) ? images : []),
      is_active !== false,
    ])

    // Sync to raw_material_master when type is RAW_MATERIAL
    if (ptype === 'RAW_MATERIAL') {
      await client.query(`
        INSERT INTO raw_material_master (sku_code, description, uom, rate)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (sku_code) DO UPDATE
          SET description = EXCLUDED.description,
              uom         = EXCLUDED.uom,
              rate        = EXCLUDED.rate
      `, [finalSku, description.trim(), (uom || 'PCS').trim().toUpperCase(), finalCp])
    }

    await client.query('COMMIT')
    return res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23505') {
      return res.status(409).json({ success: false, message: `SKU code already exists. It will be auto-generated on next attempt.` })
    }
    next(err)
  } finally {
    client.release()
  }
}

// ── PUT /api/products/:sku ─────────────────────────────────────────────────────
const updateProduct = async (req, res, next) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { sku } = req.params
    const {
      description, product_type, uom,
      design_no, category, sub_category, size_chart,
      color, hsn_code, gst_rate, basic_cost_price,
      cost_price, mrp, sp, supplier_name, brand_name,
      pack_size, images, is_active,
    } = req.body

    const sets   = []
    const params = []

    const push = (val) => { params.push(val); return `$${params.length}` }

    if (description  !== undefined) sets.push(`description = ${push(description.trim())}`)
    if (product_type !== undefined) {
      if (!VALID_TYPES.includes(product_type.toUpperCase()))
        throw createError(400, `Invalid product_type`)
      sets.push(`product_type = ${push(product_type.toUpperCase())}`)
    }
    if (uom          !== undefined) sets.push(`uom = ${push(uom.trim().toUpperCase())}`)
    if (design_no    !== undefined) sets.push(`design_no = ${push(design_no || null)}`)
    if (category     !== undefined) sets.push(`category = ${push(category || null)}`)
    if (sub_category !== undefined) sets.push(`sub_category = ${push(sub_category || null)}`)
    if (size_chart   !== undefined) sets.push(`size_chart = ${push(size_chart || null)}`)
    if (color        !== undefined) sets.push(`color = ${push(color || null)}`)
    if (hsn_code     !== undefined) sets.push(`hsn_code = ${push(hsn_code || null)}`)
    if (gst_rate     !== undefined) sets.push(`gst_rate = ${push(parseFloat(gst_rate) || 0)}`)
    if (basic_cost_price !== undefined) sets.push(`basic_cost_price = ${push(parseFloat(basic_cost_price) || 0)}`)
    if (cost_price   !== undefined) {
      const cp = parseFloat(cost_price) || 0
      sets.push(`cost_price = ${push(cp)}`)
      sets.push(`rate = ${push(cp)}`)        // keep rate in sync
    }
    if (mrp          !== undefined) sets.push(`mrp = ${push(parseFloat(mrp) || 0)}`)
    if (sp           !== undefined) sets.push(`sp = ${push(parseFloat(sp) || 0)}`)
    if (supplier_name !== undefined) sets.push(`supplier_name = ${push(supplier_name || null)}`)
    if (brand_name   !== undefined) sets.push(`brand_name = ${push(brand_name || null)}`)
    if (pack_size    !== undefined) sets.push(`pack_size = ${push(parseInt(pack_size) || 1)}`)
    if (images       !== undefined) sets.push(`images = ${push(JSON.stringify(Array.isArray(images) ? images : []))}`)
    if (is_active    !== undefined) sets.push(`is_active = ${push(!!is_active)}`)

    if (!sets.length) throw createError(400, 'No updatable fields provided.')

    sets.push(`updated_at = NOW()`)
    params.push(sku)

    const result = await client.query(`
      UPDATE product_master
      SET    ${sets.join(', ')}
      WHERE  sku_code = $${params.length}
      RETURNING *
    `, params)

    if (!result.rows.length) throw createError(404, `Product '${sku}' not found.`)

    // Sync raw_material_master if it's a RAW_MATERIAL
    const updated = result.rows[0]
    if (updated.product_type === 'RAW_MATERIAL') {
      await client.query(`
        UPDATE raw_material_master
        SET description = $1, uom = $2, rate = $3
        WHERE sku_code = $4
      `, [updated.description, updated.uom, updated.cost_price || 0, sku])
    }

    await client.query('COMMIT')
    return res.status(200).json({ success: true, data: updated })
  } catch (err) {
    await client.query('ROLLBACK')
    next(err)
  } finally {
    client.release()
  }
}

// ── DELETE /api/products/:sku ─────────────────────────────────────────────────
const deleteProduct = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const bomCheck = await query(
      `SELECT COUNT(*) FROM bom_header WHERE output_sku = $1 AND is_active = TRUE`, [sku]
    );
    if (parseInt(bomCheck.rows[0].count) > 0) {
      throw createError(409, `Cannot delete product '${sku}': referenced by active BOMs.`);
    }
    const result = await query(`DELETE FROM product_master WHERE sku_code = $1 RETURNING sku_code`, [sku]);
    if (!result.rows.length) throw createError(404, `Product '${sku}' not found.`);
    return res.status(200).json({ success: true, message: `Product '${sku}' deleted.` });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listProducts,
  getProduct,
  getNextSku,
  createProduct,
  updateProduct,
  deleteProduct,
};
