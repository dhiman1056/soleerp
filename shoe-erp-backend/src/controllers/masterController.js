'use strict';

const { query, pool } = require('../config/db');

// ── UOM ─────────────────────────────────────────────────────────────────────
const listUOMs = async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, uom_code, uom_name, is_active FROM uom_master WHERE is_active = true ORDER BY uom_name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Brands ───────────────────────────────────────────────────────────────────
const listBrands = async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const { rows } = await query(
      `SELECT id, brand_name, is_active FROM brand_master ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY brand_name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createBrand = async (req, res) => {
  try {
    const { brand_name } = req.body;
    if (!brand_name?.trim()) return res.status(400).json({ success: false, message: 'brand_name is required' });
    const { rows } = await query(
      `INSERT INTO brand_master (brand_name) VALUES ($1) ON CONFLICT (brand_name) DO UPDATE SET is_active = true RETURNING *`,
      [brand_name.trim()]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const { brand_name, is_active } = req.body;
    const sets = [];
    const params = [];
    if (brand_name !== undefined) { params.push(brand_name.trim()); sets.push(`brand_name = $${params.length}`); }
    if (is_active !== undefined)  { params.push(!!is_active);       sets.push(`is_active = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const { rows } = await query(`UPDATE brand_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Brand not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Categories ───────────────────────────────────────────────────────────────
const listCategories = async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const { rows } = await query(
      `SELECT id, category_name, is_active FROM category_master ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY category_name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createCategory = async (req, res) => {
  try {
    const { category_name } = req.body;
    if (!category_name?.trim()) return res.status(400).json({ success: false, message: 'category_name is required' });
    const { rows } = await query(
      `INSERT INTO category_master (category_name) VALUES ($1) ON CONFLICT (category_name) DO UPDATE SET is_active = true RETURNING *`,
      [category_name.trim().toUpperCase()]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { category_name, is_active } = req.body;
    const sets = [];
    const params = [];
    if (category_name !== undefined) { params.push(category_name.trim().toUpperCase()); sets.push(`category_name = $${params.length}`); }
    if (is_active !== undefined)     { params.push(!!is_active);                        sets.push(`is_active = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const { rows } = await query(`UPDATE category_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Category not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Sub-Categories ────────────────────────────────────────────────────────────
const listSubCategories = async (req, res) => {
  try {
    const { category_id } = req.query;
    const conditions = ['sc.is_active = true'];
    const params = [];
    if (category_id) { params.push(parseInt(category_id)); conditions.push(`sc.category_id = $${params.length}`); }
    const { rows } = await query(
      `SELECT sc.id, sc.sub_category_name, sc.category_id, sc.is_active,
              c.category_name
       FROM sub_category_master sc
       JOIN category_master c ON sc.category_id = c.id
       WHERE ${conditions.join(' AND ')}
       ORDER BY sc.sub_category_name`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createSubCategory = async (req, res) => {
  try {
    const { sub_category_name, category_id } = req.body;
    if (!sub_category_name?.trim()) return res.status(400).json({ success: false, message: 'sub_category_name is required' });
    if (!category_id) return res.status(400).json({ success: false, message: 'category_id is required' });
    const { rows } = await query(
      `INSERT INTO sub_category_master (sub_category_name, category_id) VALUES ($1, $2) RETURNING *`,
      [sub_category_name.trim(), parseInt(category_id)]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { sub_category_name, is_active } = req.body;
    const sets = [];
    const params = [];
    if (sub_category_name !== undefined) { params.push(sub_category_name.trim()); sets.push(`sub_category_name = $${params.length}`); }
    if (is_active !== undefined)         { params.push(!!is_active);              sets.push(`is_active = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const { rows } = await query(`UPDATE sub_category_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Sub-category not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Designs ───────────────────────────────────────────────────────────────────
const listDesigns = async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const { rows } = await query(
      `SELECT id, design_no, design_name, is_active FROM design_master ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY design_no`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createDesign = async (req, res) => {
  try {
    const { design_no, design_name } = req.body;
    if (!design_no?.trim()) return res.status(400).json({ success: false, message: 'design_no is required' });
    const { rows } = await query(
      `INSERT INTO design_master (design_no, design_name) VALUES ($1, $2) ON CONFLICT (design_no) DO UPDATE SET is_active = true RETURNING *`,
      [design_no.trim().toUpperCase(), design_name?.trim() || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateDesign = async (req, res) => {
  try {
    const { id } = req.params;
    const { design_no, design_name, is_active } = req.body;
    const sets = [];
    const params = [];
    if (design_no   !== undefined) { params.push(design_no.trim());   sets.push(`design_no   = $${params.length}`); }
    if (design_name !== undefined) { params.push(design_name?.trim() || null); sets.push(`design_name = $${params.length}`); }
    if (is_active   !== undefined) { params.push(!!is_active);        sets.push(`is_active = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const { rows } = await query(`UPDATE design_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Design not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Colors ────────────────────────────────────────────────────────────────────
const listColors = async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const { rows } = await query(
      `SELECT id, color_code, color_name, hex_code, is_active FROM color_master ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY color_name`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createColor = async (req, res) => {
  try {
    const { color_code, color_name, hex_code } = req.body;
    if (!color_code?.trim()) return res.status(400).json({ success: false, message: 'color_code is required' });
    if (!color_name?.trim()) return res.status(400).json({ success: false, message: 'color_name is required' });
    const { rows } = await query(
      `INSERT INTO color_master (color_code, color_name, hex_code) VALUES ($1, $2, $3)
       ON CONFLICT (color_code) DO UPDATE SET color_name = EXCLUDED.color_name, is_active = true
       RETURNING *`,
      [color_code.trim().toUpperCase(), color_name.trim(), hex_code?.trim() || null]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateColor = async (req, res) => {
  try {
    const { id } = req.params;
    const { color_code, color_name, hex_code, is_active } = req.body;
    const sets = [];
    const params = [];
    if (color_code  !== undefined) { params.push(color_code.trim().toUpperCase()); sets.push(`color_code = $${params.length}`); }
    if (color_name  !== undefined) { params.push(color_name.trim()); sets.push(`color_name = $${params.length}`); }
    if (hex_code    !== undefined) { params.push(hex_code?.trim() || null); sets.push(`hex_code = $${params.length}`); }
    if (is_active   !== undefined) { params.push(!!is_active);  sets.push(`is_active = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const { rows } = await query(`UPDATE color_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Color not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── HSN ───────────────────────────────────────────────────────────────────────
const listHSN = async (req, res) => {
  try {
    const activeOnly = req.query.all !== 'true';
    const { rows } = await query(
      `SELECT id, hsn_code, description, gst_rate, is_active FROM hsn_master ${activeOnly ? 'WHERE is_active = true' : ''} ORDER BY hsn_code`
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const createHSN = async (req, res) => {
  try {
    const { hsn_code, description, gst_rate } = req.body;
    if (!hsn_code?.trim()) return res.status(400).json({ success: false, message: 'hsn_code is required' });
    const { rows } = await query(
      `INSERT INTO hsn_master (hsn_code, description, gst_rate) VALUES ($1, $2, $3)
       ON CONFLICT (hsn_code) DO UPDATE SET description = EXCLUDED.description, gst_rate = EXCLUDED.gst_rate, is_active = true
       RETURNING *`,
      [hsn_code.trim(), description?.trim() || null, parseFloat(gst_rate) || 0]
    );
    return res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const updateHSN = async (req, res) => {
  try {
    const { id } = req.params;
    const { hsn_code, description, gst_rate, is_active } = req.body;
    const sets = [];
    const params = [];
    if (hsn_code    !== undefined) { params.push(hsn_code.trim()); sets.push(`hsn_code = $${params.length}`); }
    if (description !== undefined) { params.push(description?.trim() || null); sets.push(`description = $${params.length}`); }
    if (gst_rate    !== undefined) { params.push(parseFloat(gst_rate) || 0);   sets.push(`gst_rate = $${params.length}`); }
    if (is_active   !== undefined) { params.push(!!is_active); sets.push(`is_active = $${params.length}`); }
    if (!sets.length) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    const { rows } = await query(`UPDATE hsn_master SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (!rows.length) return res.status(404).json({ success: false, message: 'HSN not found' });
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Size Charts ───────────────────────────────────────────────────────────────
const listSizeCharts = async (req, res) => {
  try {
    const { category } = req.query;
    const params = [];
    const conditions = ['is_active = true'];
    if (category) { params.push(category.toUpperCase()); conditions.push(`category = $${params.length}`); }
    const { rows } = await query(
      `SELECT id, chart_name, category, uk_size, euro_size, us_size FROM size_chart_master WHERE ${conditions.join(' AND ')} ORDER BY category, CAST(uk_size AS DECIMAL)`,
      params
    );
    return res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listUOMs,
  listBrands, createBrand, updateBrand,
  listCategories, createCategory, updateCategory,
  listSubCategories, createSubCategory, updateSubCategory,
  listDesigns, createDesign, updateDesign,
  listColors, createColor, updateColor,
  listHSN, createHSN, updateHSN,
  listSizeCharts,
};
