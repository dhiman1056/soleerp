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

// ── Shared SELECT columns ──────────────────────────────────────────────────────
const SELECT_COLS = `
  p.id, p.sku_code, p.description, p.short_description, p.long_description,
  p.product_type, p.uom, p.uom_id,
  p.design_no, p.category, p.sub_category, p.size_chart,
  p.color, p.hsn_code, p.gst_rate, p.basic_cost_price,
  p.cost_price, p.mrp, p.sp, p.supplier_name, p.brand_name,
  p.pack_size, p.pack_size_uom_id, p.images, p.is_active,
  p.brand_id, p.category_id, p.sub_category_id, p.design_id, p.color_id, p.hsn_id,
  p.rate, p.created_at, p.updated_at,
  b.brand_name  AS brand_name_resolved,
  cm.category_name,
  sc.sub_category_name,
  dm.design_no  AS design_no_resolved,
  col.color_name,
  h.hsn_code    AS hsn_code_resolved,
  h.gst_rate    AS hsn_gst_rate,
  u.uom_code    AS uom_code_resolved, u.uom_name
`

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
      conditions.push(`(p.sku_code ILIKE $${params.length} OR p.description ILIKE $${params.length} OR p.short_description ILIKE $${params.length} OR p.design_no ILIKE $${params.length})`);
    }
    if (typeFilter) {
      params.push(typeFilter.toUpperCase());
      conditions.push(`p.product_type = $${params.length}`);
    }
    if (category) {
      params.push(category);
      conditions.push(`(p.category = $${params.length} OR cm.category_name = $${params.length})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await query(
      `SELECT COUNT(*) FROM product_master p
       LEFT JOIN brand_master b     ON p.brand_id    = b.id
       LEFT JOIN category_master cm ON p.category_id = cm.id
       LEFT JOIN sub_category_master sc ON p.sub_category_id = sc.id
       LEFT JOIN design_master dm   ON p.design_id   = dm.id
       LEFT JOIN color_master col   ON p.color_id    = col.id
       LEFT JOIN hsn_master h       ON p.hsn_id      = h.id
       LEFT JOIN uom_master u       ON p.uom_id      = u.id
       ${where}`, params
    );
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const dataRes = await query(`
      SELECT ${SELECT_COLS}
      FROM product_master p
      LEFT JOIN brand_master b         ON p.brand_id        = b.id
      LEFT JOIN category_master cm     ON p.category_id     = cm.id
      LEFT JOIN sub_category_master sc ON p.sub_category_id = sc.id
      LEFT JOIN design_master dm       ON p.design_id       = dm.id
      LEFT JOIN color_master col       ON p.color_id        = col.id
      LEFT JOIN hsn_master h           ON p.hsn_id          = h.id
      LEFT JOIN uom_master u           ON p.uom_id          = u.id
      ${where}
      ORDER BY p.product_type, p.sku_code
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
      SELECT ${SELECT_COLS}
      FROM product_master p
      LEFT JOIN brand_master b         ON p.brand_id        = b.id
      LEFT JOIN category_master cm     ON p.category_id     = cm.id
      LEFT JOIN sub_category_master sc ON p.sub_category_id = sc.id
      LEFT JOIN design_master dm       ON p.design_id       = dm.id
      LEFT JOIN color_master col       ON p.color_id        = col.id
      LEFT JOIN hsn_master h           ON p.hsn_id          = h.id
      LEFT JOIN uom_master u           ON p.uom_id          = u.id
      WHERE p.sku_code = $1
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
      description, short_description, long_description,
      product_type, uom, uom_id, pack_size, pack_size_uom_id,
      brand_name, brand_id,
      supplier_name,
      design_no, design_id,
      category, category_id,
      sub_category, sub_category_id,
      size_chart,
      color, color_id,
      hsn_code, hsn_id,
      gst_rate, basic_cost_price,
      cost_price, mrp, sp,
      images, is_active,
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
        sku_code, description, short_description, long_description,
        product_type, uom, uom_id, pack_size, pack_size_uom_id,
        brand_name, brand_id, supplier_name,
        design_no, design_id,
        category, category_id,
        sub_category, sub_category_id,
        size_chart,
        color, color_id,
        hsn_code, hsn_id,
        gst_rate, basic_cost_price,
        cost_price, rate, mrp, sp,
        images, is_active,
        created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,
        $19,$20,$21,$22,$23,$24,$25,$26,
        $27,$28,$29,$30,$31, NOW(), NOW()
      ) RETURNING *
    `, [
      finalSku, description.trim(),
      short_description?.trim() || null,
      long_description?.trim()  || null,
      ptype,
      (uom || 'PCS').trim().toUpperCase(),
      uom_id         ? parseInt(uom_id)         : null,
      pack_size !== undefined && pack_size !== null ? String(pack_size).trim() : '1',
      pack_size_uom_id ? parseInt(pack_size_uom_id) : null,
      brand_name     || null,
      brand_id       ? parseInt(brand_id)       : null,
      supplier_name  || null,
      design_no      || null,
      design_id      ? parseInt(design_id)      : null,
      category       || null,
      category_id    ? parseInt(category_id)    : null,
      sub_category   || null,
      sub_category_id ? parseInt(sub_category_id) : null,
      size_chart     || null,
      color          || null,
      color_id       ? parseInt(color_id)       : null,
      hsn_code       || null,
      hsn_id         ? parseInt(hsn_id)         : null,
      gstRate, basicCp,
      finalCp,
      finalCp,  // rate mirrors cost_price for stock valuation
      parseFloat(mrp) || 0,
      parseFloat(sp)  || 0,
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
      description, short_description, long_description,
      product_type, uom, uom_id, pack_size, pack_size_uom_id,
      brand_name, brand_id,
      supplier_name,
      design_no, design_id,
      category, category_id,
      sub_category, sub_category_id,
      size_chart,
      color, color_id,
      hsn_code, hsn_id,
      gst_rate, basic_cost_price,
      cost_price, mrp, sp,
      images, is_active,
    } = req.body

    const sets   = []
    const params = []

    const push = (val) => { params.push(val); return `$${params.length}` }

    if (description       !== undefined) sets.push(`description       = ${push(description.trim())}`)
    if (short_description !== undefined) sets.push(`short_description = ${push(short_description?.trim() || null)}`)
    if (long_description  !== undefined) sets.push(`long_description  = ${push(long_description?.trim() || null)}`)
    if (product_type      !== undefined) {
      if (!VALID_TYPES.includes(product_type.toUpperCase()))
        throw createError(400, `Invalid product_type`)
      sets.push(`product_type = ${push(product_type.toUpperCase())}`)
    }
    if (uom              !== undefined) sets.push(`uom = ${push(uom.trim().toUpperCase())}`)
    if (uom_id           !== undefined) sets.push(`uom_id = ${push(uom_id ? parseInt(uom_id) : null)}`)
    if (pack_size        !== undefined) sets.push(`pack_size = ${push(pack_size !== null ? String(pack_size).trim() : '1')}`)
    if (pack_size_uom_id !== undefined) sets.push(`pack_size_uom_id = ${push(pack_size_uom_id ? parseInt(pack_size_uom_id) : null)}`)
    if (brand_name       !== undefined) sets.push(`brand_name = ${push(brand_name || null)}`)
    if (brand_id         !== undefined) sets.push(`brand_id = ${push(brand_id ? parseInt(brand_id) : null)}`)
    if (supplier_name    !== undefined) sets.push(`supplier_name = ${push(supplier_name || null)}`)
    if (design_no        !== undefined) sets.push(`design_no = ${push(design_no || null)}`)
    if (design_id        !== undefined) sets.push(`design_id = ${push(design_id ? parseInt(design_id) : null)}`)
    if (category         !== undefined) sets.push(`category = ${push(category || null)}`)
    if (category_id      !== undefined) sets.push(`category_id = ${push(category_id ? parseInt(category_id) : null)}`)
    if (sub_category     !== undefined) sets.push(`sub_category = ${push(sub_category || null)}`)
    if (sub_category_id  !== undefined) sets.push(`sub_category_id = ${push(sub_category_id ? parseInt(sub_category_id) : null)}`)
    if (size_chart       !== undefined) sets.push(`size_chart = ${push(size_chart || null)}`)
    if (color            !== undefined) sets.push(`color = ${push(color || null)}`)
    if (color_id         !== undefined) sets.push(`color_id = ${push(color_id ? parseInt(color_id) : null)}`)
    if (hsn_code         !== undefined) sets.push(`hsn_code = ${push(hsn_code || null)}`)
    if (hsn_id           !== undefined) sets.push(`hsn_id = ${push(hsn_id ? parseInt(hsn_id) : null)}`)
    if (gst_rate         !== undefined) sets.push(`gst_rate = ${push(parseFloat(gst_rate) || 0)}`)
    if (basic_cost_price !== undefined) sets.push(`basic_cost_price = ${push(parseFloat(basic_cost_price) || 0)}`)
    if (cost_price       !== undefined) {
      const cp = parseFloat(cost_price) || 0
      sets.push(`cost_price = ${push(cp)}`)
      sets.push(`rate = ${push(cp)}`)        // keep rate in sync
    }
    if (mrp         !== undefined) sets.push(`mrp = ${push(parseFloat(mrp) || 0)}`)
    if (sp          !== undefined) sets.push(`sp = ${push(parseFloat(sp) || 0)}`)
    if (images      !== undefined) sets.push(`images = ${push(JSON.stringify(Array.isArray(images) ? images : []))}`)
    if (is_active   !== undefined) sets.push(`is_active = ${push(!!is_active)}`)

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

const importProducts = async (req, res, next) => {
  const { rows } = req.body
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ message: 'No rows provided' })
  }

  let imported = 0, skipped = 0
  const errors = []
  const client = await pool.connect()

  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      try {
        // Basic Info
        const product_type_raw  = (row['Product Type'] || '').trim()
        const sku_code          = (row['SKU Code'] || '').trim().toUpperCase()
        const description       = (row['Short Description'] || '').trim()
        const long_desc         = (row['Long Description'] || '').trim()
        const uom_name          = (row['UOM'] || '').trim()
        const pack_size         = (row['Pack Size'] || '1').trim()
        const brand_name        = (row['Brand Name'] || '').trim()
        const supplier_name     = (row['Supplier Name'] || '').trim()

        // Classification
        const catg_name     = (row['Category'] || '').trim()
        const sub_catg_name = (row['Sub Category'] || '').trim()
        const design_no     = (row['Design No'] || '').trim()
        const color_code    = (row['Color Code'] || '').trim()

        // Pricing & Tax
        const hsn_code_val  = (row['HSN Code'] || '').trim()
        const gst_rate_val  = (row['GST Rate %'] || '').trim()
        const basic_cost    = parseFloat(row['Basic Cost Price'] || 0)
        const mrp           = parseFloat(row['MRP'] || 0)
        const selling_price = parseFloat(row['Selling Price'] || 0)

        // Validations
        let ptype = ''
        const ptype_lower = product_type_raw.toLowerCase()
        if (ptype_lower === 'raw material' || ptype_lower === 'raw_material') {
          ptype = 'RAW_MATERIAL'
        } else if (ptype_lower === 'semi finished' || ptype_lower === 'semi_finished') {
          ptype = 'SEMI_FINISHED'
        } else if (ptype_lower === 'finished good' || ptype_lower === 'finished_good' || ptype_lower === 'finished goods' || ptype_lower === 'finished') {
          ptype = 'FINISHED'
        }

        if (!ptype) {
          errors.push({
            row: rowNum,
            message: `Product Type must be: Raw Material | Semi Finished | Finished Good`
          })
          continue
        }
        if (!description) {
          errors.push({ row: rowNum, message: 'Short Description is required' })
          continue
        }
        if (!uom_name) {
          errors.push({ row: rowNum, message: 'UOM is required' })
          continue
        }

        // Check SKU duplicate if provided
        if (sku_code) {
          const dup = await client.query(
            'SELECT id FROM product_master WHERE sku_code = $1', [sku_code]
          )
          if (dup.rows.length > 0) { skipped++; continue }
        }

        // Resolve UOM (required)
        const uomRes = await client.query(
          'SELECT id, uom_code FROM uom_master WHERE LOWER(uom_name) = LOWER($1) OR UPPER(uom_code) = UPPER($1)',
          [uom_name]
        )
        if (uomRes.rows.length === 0) {
          errors.push({
            row: rowNum,
            message: `UOM "${uom_name}" not found. Create it first in UOM Master.`
          })
          continue
        }
        const uom_id = uomRes.rows[0].id
        const uom_code = uomRes.rows[0].uom_code

        // Resolve Brand (optional)
        let brand_id = null
        let resolved_brand_name = null
        if (brand_name) {
          const bRes = await client.query(
            'SELECT id, brand_name FROM brand_master WHERE LOWER(brand_name) = LOWER($1)',
            [brand_name]
          )
          if (bRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `Brand "${brand_name}" not found. Create it first in Brand Master.`
            })
            continue
          }
          brand_id = bRes.rows[0].id
          resolved_brand_name = bRes.rows[0].brand_name
        }

        // Resolve Supplier (optional)
        let resolved_supplier_name = null
        if (supplier_name) {
          const sRes = await client.query(
            'SELECT id, supplier_name FROM suppliers WHERE LOWER(supplier_name) = LOWER($1)',
            [supplier_name]
          )
          if (sRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `Supplier "${supplier_name}" not found. Create it first in Suppliers.`
            })
            continue
          }
          resolved_supplier_name = sRes.rows[0].supplier_name
        }

        // Resolve Category (optional)
        let category_id = null
        let resolved_category_name = null
        if (catg_name) {
          const cRes = await client.query(
            'SELECT id, catg_name FROM category_master WHERE LOWER(catg_name) = LOWER($1)',
            [catg_name]
          )
          if (cRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `Category "${catg_name}" not found. Create it first in Category Master.`
            })
            continue
          }
          category_id = cRes.rows[0].id
          resolved_category_name = cRes.rows[0].catg_name
        }

        // Resolve Sub Category (optional)
        let sub_category_id = null
        let resolved_sub_category_name = null
        if (sub_catg_name) {
          const scRes = await client.query(
            'SELECT id, sub_category_name FROM sub_category_master WHERE LOWER(sub_category_name) = LOWER($1)',
            [sub_catg_name]
          )
          if (scRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `Sub Category "${sub_catg_name}" not found. Create it first in Sub Category Master.`
            })
            continue
          }
          sub_category_id = scRes.rows[0].id
          resolved_sub_category_name = scRes.rows[0].sub_category_name
        }

        // Resolve Design (optional)
        let design_id = null
        let resolved_design_no = null
        if (design_no) {
          const dRes = await client.query(
            'SELECT id, design_no FROM design_master WHERE LOWER(design_no) = LOWER($1)',
            [design_no]
          )
          if (dRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `Design No "${design_no}" not found. Create it first in Design Master.`
            })
            continue
          }
          design_id = dRes.rows[0].id
          resolved_design_no = dRes.rows[0].design_no
        }

        // Resolve Color (optional)
        let color_id = null
        let resolved_color_name = null
        if (color_code) {
          const colRes = await client.query(
            'SELECT id, color_name FROM color_master WHERE UPPER(color_code) = UPPER($1) OR LOWER(color_name) = LOWER($1)',
            [color_code]
          )
          if (colRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `Color "${color_code}" not found. Create it first in Color Master.`
            })
            continue
          }
          color_id = colRes.rows[0].id
          resolved_color_name = colRes.rows[0].color_name
        }

        // Resolve HSN (optional)
        let hsn_id = null
        let resolved_hsn_code = null
        if (hsn_code_val) {
          const hRes = await client.query(
            'SELECT id, hsn_code FROM hsn_master WHERE hsn_code = $1',
            [hsn_code_val]
          )
          if (hRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `HSN Code "${hsn_code_val}" not found. Create it first in HSN Master.`
            })
            continue
          }
          hsn_id = hRes.rows[0].id
          resolved_hsn_code = hRes.rows[0].hsn_code
        }

        // Resolve GST (optional)
        let gst_id = null
        let gstRate = 0
        if (gst_rate_val) {
          const gRes = await client.query(
            'SELECT id, gst_rate FROM gst_master WHERE gst_rate = $1',
            [parseFloat(gst_rate_val)]
          )
          if (gRes.rows.length === 0) {
            errors.push({
              row: rowNum,
              message: `GST Rate "${gst_rate_val}%" not found. Create it first in GST Master.`
            })
            continue
          }
          gst_id = gRes.rows[0].id
          gstRate = parseFloat(gRes.rows[0].gst_rate) || 0
        }

        // Generate SKU if not provided
        const finalSku = sku_code
          ? sku_code
          : await generateSku(client, ptype)

        // Calculate CP basic formula
        const finalCp = +(basic_cost * (1 + gstRate / 100)).toFixed(2)

        await client.query('BEGIN')

        await client.query(`
          INSERT INTO product_master (
            sku_code, description, short_description, long_description,
            product_type, uom, uom_id, pack_size,
            brand_name, brand_id, supplier_name,
            category, category_id, sub_category, sub_category_id,
            design_no, design_id, color, color_id,
            hsn_code, hsn_id, gst_rate, gst_id,
            basic_cost_price, cost_price, rate, mrp, sp,
            images, is_active, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW(), NOW()
          )
        `, [
          finalSku, description, description, long_desc || null,
          ptype, uom_code, uom_id, pack_size,
          resolved_brand_name, brand_id, resolved_supplier_name,
          resolved_category_name, category_id, resolved_sub_category_name, sub_category_id,
          resolved_design_no, design_id, resolved_color_name, color_id,
          resolved_hsn_code, hsn_id, gstRate, gst_id,
          basic_cost, finalCp, finalCp, mrp, selling_price,
          JSON.stringify([]), true
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
          `, [finalSku, description, uom_code, finalCp])
        }

        await client.query('COMMIT')
        imported++
      } catch (err) {
        await client.query('ROLLBACK')
        errors.push({ row: rowNum, message: err.message })
      }
    }
  } finally {
    client.release()
  }

  res.json({ success: true, imported, skipped, errors })
}

module.exports = {
  listProducts,
  getProduct,
  getNextSku,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts,
};
