'use strict';

const { query } = require('../config/db');

exports.getNotifications = async (req, res, next) => {
  try {
    const role = req.user.role;
    const { is_read, severity, type, limit = 50 } = req.query;

    let q = `SELECT * FROM notifications WHERE target_roles LIKE $1`;
    const params = [`%${role}%`];

    if (is_read === 'true' || is_read === 'false') {
      params.push(is_read === 'true');
      q += ` AND is_read = $${params.length}`;
    }

    if (severity) {
      params.push(severity);
      q += ` AND severity = $${params.length}`;
    }

    if (type) {
      params.push(type);
      q += ` AND notification_type = $${params.length}`;
    }

    q += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const { rows } = await query(q, params);
    return res.json({ success: true, data: rows });
  } catch (err) {
    next(err);
  }
};

exports.getNotificationCount = async (req, res, next) => {
  try {
    const role = req.user.role;
    const { rows } = await query(`
      SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE is_read = FALSE) AS unread,
        COUNT(*) FILTER (WHERE is_read = FALSE AND severity = 'CRITICAL') AS critical
      FROM notifications
      WHERE target_roles LIKE $1
    `, [`%${role}%`]);

    return res.json({ success: true, data: rows[0] });
  } catch(err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rows } = await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING id`, [id]);
    if(rows.length === 0) return res.status(404).json({ success: false, message: 'Notification not found' });
    return res.json({ success: true, message: 'Marked read' });
  } catch(err) {
    next(err);
  }
};

exports.markAllRead = async (req, res, next) => {
  try {
    const role = req.user.role;
    await query(`UPDATE notifications SET is_read = TRUE WHERE target_roles LIKE $1 AND is_read = FALSE`, [`%${role}%`]);
    return res.json({ success: true, message: 'All marked read' });
  } catch(err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    await query(`DELETE FROM notifications WHERE id = $1`, [id]);
    return res.json({ success: true, message: 'Deleted' });
  } catch(err) {
    next(err);
  }
};
