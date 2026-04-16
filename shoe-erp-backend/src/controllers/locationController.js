'use strict';

const { query } = require('../config/db');

const VALID_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED_GOODS', 'WIP', 'OTHER'];

// ─── GET /api/locations ───────────────────────────────────────────────────────
const listLocations = async (req, res) => {
  try {
    const { type, all } = req.query;
    const params = [];
    let sql = 'SELECT * FROM location_master';
    const conditions = [];

    if (!all) conditions.push('is_active = true');
    if (type) { params.push(type.toUpperCase()); conditions.push(`location_type = $${params.length}`); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY location_type, location_name';

    const { rows } = await query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── GET /api/locations/:id ───────────────────────────────────────────────────
const getLocationById = async (req, res) => {
  try {
    const { rows } = await query('SELECT * FROM location_master WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Location not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── POST /api/locations ──────────────────────────────────────────────────────
const createLocation = async (req, res) => {
  try {
    const { location_code, location_name, location_type, description } = req.body;
    if (!location_code || !location_name || !location_type) {
      return res.status(400).json({ success: false, message: 'location_code, location_name and location_type are required' });
    }
    if (!VALID_TYPES.includes(location_type.toUpperCase())) {
      return res.status(400).json({ success: false, message: `location_type must be one of: ${VALID_TYPES.join(', ')}` });
    }
    const { rows } = await query(`
      INSERT INTO location_master (location_code, location_name, location_type, description)
      VALUES ($1, $2, $3, $4) RETURNING *
    `, [location_code.toUpperCase(), location_name, location_type.toUpperCase(), description || null]);
    res.status(201).json({ success: true, data: rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, message: 'Location code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── PUT /api/locations/:id ───────────────────────────────────────────────────
const updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { location_name, location_type, description, is_active } = req.body;
    const { rows } = await query(`
      UPDATE location_master
      SET location_name = COALESCE($1, location_name),
          location_type = COALESCE($2, location_type),
          description   = COALESCE($3, description),
          is_active     = COALESCE($4, is_active)
      WHERE id = $5 RETURNING *
    `, [location_name || null, location_type?.toUpperCase() || null, description ?? null, is_active ?? null, id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Location not found' });
    res.json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { listLocations, getLocationById, createLocation, updateLocation };
