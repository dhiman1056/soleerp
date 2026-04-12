'use strict';

const { query } = require('../config/db');

/**
 * GET /api/settings
 * Returns all settings
 */
exports.getAllSettings = async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM company_settings ORDER BY setting_group, id');
    
    const grouped = rows.reduce((acc, row) => {
      if (!acc[row.setting_group]) acc[row.setting_group] = [];
      acc[row.setting_group].push(row);
      return acc;
    }, {});

    return res.json({ success: true, data: grouped });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/settings/:group
 */
exports.getSettingsByGroup = async (req, res, next) => {
  try {
    const { group } = req.params;
    const { rows } = await query('SELECT * FROM company_settings WHERE setting_group = $1 ORDER BY id', [group.toUpperCase()]);
    
    // Also return as key-value pairs for easy parsing
    const map = {};
    rows.forEach(r => map[r.setting_key] = r.setting_value);

    return res.json({ success: true, data: rows, map });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/settings
 */
exports.updateSettings = async (req, res, next) => {
  try {
    const { updates } = req.body;
    // Expected updates format: [ { setting_key: 'company_name', setting_value: 'New Name' }, ... ]

    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: "Updates must be an array" });
    }

    for (let u of updates) {
      await query(`
        UPDATE company_settings 
        SET setting_value = $1, updated_by = $2, updated_at = NOW() 
        WHERE setting_key = $3
      `, [u.setting_value, req.user.id, u.setting_key]);
    }

    return res.json({ success: true, message: 'Settings updated successfully' });
  } catch(err) {
    next(err);
  }
};
